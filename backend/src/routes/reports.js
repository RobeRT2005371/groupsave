import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { decrypt } from '../security.js';
import { audit } from '../ledger.js';

const r = Router();

// Quote cells and neutralise spreadsheet formula injection.
const cell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};

r.get('/ledger.csv', requireRole('chairperson', 'treasurer', 'secretary', 'auditor'), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT p.id, p.created_at, m.full_name, p.type, p.amount, p.reverses_id, p.running_balance, o.full_name AS by, left(p.hash,4) AS code
     FROM postings p JOIN cycles c ON c.id=p.cycle_id JOIN members m ON m.id=p.member_id JOIN members o ON o.id=p.recorded_by
     WHERE c.group_id=$1 AND ($2::int IS NULL OR p.cycle_id=$2) ORDER BY p.id`, [req.user.groupId, req.query.cycleId || null]);
  const lines = ['Ref,Date,Member,Type,Amount (K),Reverses,Savings after (K),Recorded by,Code'];
  for (const p of rows) {
    lines.push([p.id, new Date(p.created_at).toISOString(), p.full_name, p.type, (p.amount / 100).toFixed(2), p.reverses_id, (p.running_balance / 100).toFixed(2), p.by, p.code.toUpperCase()].map(cell).join(','));
  }
  res.type('text/csv').attachment('ledger.csv').send(lines.join('\r\n'));
}));

// Per-member statement across the group's cycles.
r.get('/member/:id', requireRole('chairperson', 'treasurer', 'secretary', 'auditor'), wrap(async (req, res) => {
  const m = (await q('SELECT id, full_name, role, status FROM members WHERE id=$1 AND group_id=$2', [req.params.id, req.user.groupId])).rows[0];
  if (!m) throw httpError(404, 'Member not found');
  const postings = (await q(
    `SELECT p.id, p.created_at, p.type, p.amount, p.reverses_id, p.running_balance, left(p.hash,4) AS code
     FROM postings p WHERE p.member_id=$1 ORDER BY p.id`, [m.id])).rows;
  const loans = (await q(
    `SELECT l.id, l.principal, l.status, COALESCE(SUM(s.principal_due + s.interest_due - s.paid_amount),0) AS outstanding
     FROM loans l LEFT JOIN schedule_items s ON s.loan_id=l.id WHERE l.member_id=$1 GROUP BY l.id ORDER BY l.id`, [m.id])).rows;
  const sum = (t) => postings.filter((p) => p.type === t).reduce((a, p) => a + p.amount, 0);
  res.json({ member: m, savings: sum('contribution'), fines: sum('fine'), postings, loans, generated: new Date().toISOString() });
}));

export default r;

// Full copy of the group's records. Contains phone numbers, so only the chairperson can download it and each download is logged.
r.get('/backup.json', requireRole('chairperson'), wrap(async (req, res) => {
  const g = req.user.groupId;
  const data = await tx(async (c) => {
    await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const all = async (sql, params = [g]) => (await c.query(sql, params)).rows;
    const members = (await all('SELECT id, full_name, phone_enc, role, status, language, created_at FROM members WHERE group_id=$1 ORDER BY id'))
      .map(({ phone_enc, ...m }) => ({ ...m, phone: decrypt(phone_enc) }));
    return {
      format: 'groupsave-backup-1',
      exportedAt: new Date().toISOString(),
      group: (await all('SELECT id, name, type, location, created_at FROM groups WHERE id=$1'))[0],
      members,
      cycles: await all('SELECT * FROM cycles WHERE group_id=$1 ORDER BY id'),
      rotationTurns: await all('SELECT rt.* FROM rotation_turns rt JOIN cycles c ON c.id=rt.cycle_id WHERE c.group_id=$1 ORDER BY rt.cycle_id, rt.turn_order'),
      groupJoinRequests: (await all(
        `SELECT r.id, r.group_id, r.status, r.decided_by, r.member_id,
           r.created_at, r.decided_at, a.full_name, a.phone_enc
         FROM group_join_requests r JOIN group_applicants a ON a.id=r.applicant_id
         WHERE r.group_id=$1 ORDER BY r.id`,
      )).map(({ phone_enc, ...request }) => ({ ...request, phone: decrypt(phone_enc) })),
      meetings: await all('SELECT mt.id, mt.cycle_id, mt.date, mt.online, mt.room, mt.start_time FROM meetings mt JOIN cycles c ON c.id=mt.cycle_id WHERE c.group_id=$1 ORDER BY mt.id'),
      attendance: await all('SELECT a.* FROM attendance a JOIN meetings mt ON mt.id=a.meeting_id JOIN cycles c ON c.id=mt.cycle_id WHERE c.group_id=$1'),
      postings: await all('SELECT p.* FROM postings p JOIN cycles c ON c.id=p.cycle_id WHERE c.group_id=$1 ORDER BY p.id'),
      loans: await all('SELECT l.* FROM loans l JOIN cycles c ON c.id=l.cycle_id WHERE c.group_id=$1 ORDER BY l.id'),
      scheduleItems: await all('SELECT s.* FROM schedule_items s JOIN loans l ON l.id=s.loan_id JOIN cycles c ON c.id=l.cycle_id WHERE c.group_id=$1 ORDER BY s.id'),
      paymentReceipts: await all('SELECT * FROM payment_receipts WHERE group_id=$1 ORDER BY id'),
      loanRequests: await all('SELECT lr.* FROM loan_requests lr JOIN members m ON m.id=lr.member_id WHERE m.group_id=$1 ORDER BY lr.id'),
      disputes: await all('SELECT d.* FROM disputes d JOIN members m ON m.id=d.member_id WHERE m.group_id=$1 ORDER BY d.id'),
      notifications: await all('SELECT n.* FROM notifications n JOIN members m ON m.id=n.member_id WHERE m.group_id=$1 ORDER BY n.id'),
      alertDismissals: await all('SELECT a.* FROM alert_dismissals a JOIN members m ON m.id=a.member_id WHERE m.group_id=$1'),
      auditLog: await all('SELECT id, actor, action, entity, before, after, created_at FROM audit_log WHERE group_id=$1 ORDER BY id'),
      announcements: await all('SELECT id, author_id, body, sms_sent, created_at FROM announcements WHERE group_id=$1 ORDER BY id'),
    };
  });
  await audit({ query: q }, { groupId: g, actor: req.user.id, action: 'backup.download', entity: 'group:' + g });
  res.setHeader('Content-Disposition', 'attachment; filename="groupsave-backup.json"');
  res.json(data);
}));

// Savings per member for the open cycle, as a CSV that Excel opens.
r.get('/savings.csv', requireRole('chairperson', 'treasurer', 'secretary', 'auditor'), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT m.full_name,
            COALESCE(SUM(p.amount) FILTER (WHERE p.type='contribution'),0) AS savings,
            COALESCE(SUM(p.amount) FILTER (WHERE p.type='fine'),0) AS fines,
            COALESCE(SUM(p.amount) FILTER (WHERE p.type='loan_disbursement'),0) * -1 AS loans,
            COALESCE(SUM(p.amount) FILTER (WHERE p.type='loan_repayment'),0) AS repaid
     FROM members m JOIN cycles c ON c.group_id=m.group_id AND c.status='open'
     LEFT JOIN postings p ON p.member_id=m.id AND p.cycle_id=c.id
     WHERE m.group_id=$1 AND m.status='active' GROUP BY m.id ORDER BY m.full_name`, [req.user.groupId]);
  const k = (n) => (Number(n) / 100).toFixed(2);
  const lines = ['Member,Savings (K),Fines (K),Loans taken (K),Loan repaid (K)'];
  for (const x of rows) lines.push([x.full_name, k(x.savings), k(x.fines), k(x.loans), k(x.repaid)].map(cell).join(','));
  res.type('text/csv').attachment('savings.csv').send(lines.join('\r\n'));
}));
