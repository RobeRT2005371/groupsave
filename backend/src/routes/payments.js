import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { addPosting, audit } from '../ledger.js';
import { recordRepayment } from './loans.js';
import { periodDays, kwacha } from '../rules.js';
import { t } from '../i18n.js';

const r = Router();
const OFFICERS = ['chairperson', 'treasurer'];
const READERS = ['chairperson', 'treasurer', 'secretary', 'auditor'];

// The pot: how much money the group holds in the open cycle, and where it came from.
r.get('/pot', requireRole(...READERS), wrap(async (req, res) => {
  const cycle = (await q("SELECT id, start_date, end_date FROM cycles WHERE group_id=$1 AND status='open' ORDER BY id DESC LIMIT 1", [req.user.groupId])).rows[0];
  if (!cycle) return res.json({ cycle: null });
  const by = (await q('SELECT type, COALESCE(SUM(amount),0) AS total FROM postings WHERE cycle_id=$1 GROUP BY type', [cycle.id])).rows;
  const t = (x) => Number(by.find((b) => b.type === x)?.total || 0);
  const members = (await q(
    `SELECT m.id, m.full_name,
            COALESCE(SUM(p.amount) FILTER (WHERE p.type='contribution'),0) AS savings,
            COALESCE(SUM(p.amount) FILTER (WHERE p.type='fine'),0) AS fines
     FROM members m LEFT JOIN postings p ON p.member_id=m.id AND p.cycle_id=$2
     WHERE m.group_id=$1 AND m.status='active' GROUP BY m.id ORDER BY savings DESC, m.full_name`, [req.user.groupId, cycle.id])).rows;
  const pending = (await q("SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS total FROM online_payments WHERE group_id=$1 AND status='pending'", [req.user.groupId])).rows[0];
  res.json({
    cycle,
    pot: by.reduce((a, b) => a + Number(b.total), 0),
    contributions: t('contribution'), fines: t('fine'), repayments: t('loan_repayment'),
    loansOut: -t('loan_disbursement'), paidOut: -t('payout'),
    pending: { count: Number(pending.n), total: Number(pending.total) },
    members: members.map((m) => ({ ...m, savings: Number(m.savings), fines: Number(m.fines) })),
  });
}));

// Members with no contribution recorded in the current period (week/fortnight/month, from the cycle rules).
async function unpaidMembers(groupId) {
  const cycle = (await q("SELECT id, rules FROM cycles WHERE group_id=$1 AND status='open' ORDER BY id DESC LIMIT 1", [groupId])).rows[0];
  if (!cycle) return { cycle: null, days: 0, amount: 0, members: [] };
  const days = periodDays(cycle.rules.frequency);
  const { rows } = await q(
    `SELECT m.id, m.full_name, m.language FROM members m
     WHERE m.group_id=$1 AND m.status='active' AND m.role='member'
       AND NOT EXISTS (SELECT 1 FROM postings p WHERE p.member_id=m.id AND p.cycle_id=$2 AND p.type='contribution' AND p.amount>0
                       AND p.created_at > now() - ($3 || ' days')::interval)
     ORDER BY m.full_name`, [groupId, cycle.id, String(days)]);
  return { cycle, days, amount: Number(cycle.rules.contribution_amount) || 0, members: rows };
}

r.get('/unpaid', requireRole(...READERS), wrap(async (req, res) => {
  const u = await unpaidMembers(req.user.groupId);
  res.json({ days: u.days, amount: u.amount, members: u.members.map(({ id, full_name }) => ({ id, full_name })) });
}));

r.post('/remind-unpaid', requireRole(...OFFICERS), wrap(async (req, res) => {
  const u = await unpaidMembers(req.user.groupId);
  // at most one reminder run per hour per group
  const recent = (await q("SELECT 1 FROM audit_log WHERE group_id=$1 AND action='contribution.remind' AND created_at > now() - interval '1 hour' LIMIT 1", [req.user.groupId])).rowCount;
  if (recent) throw httpError(429, 'Reminders were already sent in the last hour');
  for (const m of u.members) await q('INSERT INTO notifications (member_id, body) VALUES ($1,$2)', [m.id, t(m.language, 'remindPay', { amt: kwacha(u.amount) })]);
  await audit({ query: q }, { groupId: req.user.groupId, actor: req.user.id, action: 'contribution.remind', entity: 'group', after: { count: u.members.length } });
  res.json({ sent: u.members.length });
}));

// Money coming in, by week, for the last 12 weeks.
r.get('/trend', requireRole(...READERS), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT date_trunc('week', p.created_at)::date AS week, SUM(p.amount) AS total
     FROM postings p JOIN cycles c ON c.id=p.cycle_id
     WHERE c.group_id=$1 AND p.type='contribution' AND p.created_at > now() - interval '12 weeks'
     GROUP BY 1 ORDER BY 1`, [req.user.groupId]);
  res.json(rows.map((x) => ({ week: x.week, total: Number(x.total) })));
}));

r.get('/', requireRole(...READERS), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT o.id, o.loan_id, o.amount, o.method, o.reference, o.status, o.created_at, o.decided_at, m.full_name AS member_name
     FROM online_payments o JOIN members m ON m.id=o.member_id
     WHERE o.group_id=$1 ORDER BY (o.status='pending') DESC, o.id DESC LIMIT 100`, [req.user.groupId]);
  res.json(rows);
}));

r.post('/:id/confirm', requireRole(...OFFICERS), wrap(async (req, res) => {
  const out = await tx(async (c) => {
    const p = (await c.query('SELECT o.*, cy.status AS cycle_status FROM online_payments o JOIN cycles cy ON cy.id=o.cycle_id WHERE o.id=$1 AND o.group_id=$2 FOR UPDATE OF o', [Number(req.params.id), req.user.groupId])).rows[0];
    if (!p) throw httpError(404, 'Payment not found');
    if (p.status !== 'pending') throw httpError(409, 'This payment was already handled');
    if (p.cycle_status !== 'open') throw httpError(400, 'Cycle is closed');
    const note = `Online payment (${p.method}) ref ${p.reference}`;
    const posting = p.loan_id
      ? await recordRepayment(c, { groupId: req.user.groupId, actorId: req.user.id, loanId: p.loan_id, amount: Number(p.amount), note })
      : await addPosting(c, { cycleId: p.cycle_id, memberId: p.member_id, type: 'contribution', amount: Number(p.amount), note, actorId: req.user.id, groupId: req.user.groupId });
    await c.query("UPDATE online_payments SET status='confirmed', posting_id=$2, decided_by=$3, decided_at=now() WHERE id=$1", [p.id, posting.id, req.user.id]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'onlinepayment.confirm', entity: `onlinepayment:${p.id}`, after: { postingId: posting.id } });
    return posting;
  });
  res.json(out);
}));

r.post('/:id/reject', requireRole(...OFFICERS), wrap(async (req, res) => {
  await tx(async (c) => {
    const { rowCount } = await c.query(
      "UPDATE online_payments SET status='rejected', decided_by=$3, decided_at=now(), note=$4 WHERE id=$1 AND group_id=$2 AND status='pending'",
      [Number(req.params.id), req.user.groupId, req.user.id, String(req.body.reason || '').slice(0, 200) || null]);
    if (!rowCount) throw httpError(404, 'Pending payment not found');
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'onlinepayment.reject', entity: `onlinepayment:${req.params.id}` });
  });
  res.json({ ok: true });
}));

export default r;
