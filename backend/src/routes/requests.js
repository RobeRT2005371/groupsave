import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { audit } from '../ledger.js';
import { issueLoan } from './loans.js';
import { t } from '../i18n.js';
import { kwacha, needsSecondApproval } from '../rules.js';

const OFFICERS = ['chairperson', 'treasurer'];
const READERS = ['chairperson', 'treasurer', 'secretary', 'auditor'];

// ---------- loan requests: members ask in the portal, officers decide ----------
export const loanRequests = Router();

loanRequests.get('/', requireRole(...READERS), wrap(async (req, res) => {
  const threshold = (await q('SELECT loan_two_approvals_over AS t FROM groups WHERE id=$1', [req.user.groupId])).rows[0]?.t ?? null;
  const { rows } = await q(
    `SELECT lr.id, lr.amount, lr.instalments, lr.status, lr.note, lr.created_at, lr.decided_at, m.full_name AS member_name,
            lr.guarantor_status, gm.full_name AS guarantor_name,
            (SELECT COALESCE(SUM(p.amount),0) FROM postings p JOIN cycles c ON c.id=p.cycle_id WHERE p.member_id=lr.guarantor_id AND p.type='contribution' AND c.status='open') AS guarantor_savings,
            (SELECT COUNT(*) FROM loan_request_approvals a WHERE a.request_id=lr.id)::int AS approvals,
            EXISTS (SELECT 1 FROM loan_request_approvals a WHERE a.request_id=lr.id AND a.officer_id=$2) AS approved_by_me
     FROM loan_requests lr JOIN members m ON m.id=lr.member_id LEFT JOIN members gm ON gm.id=lr.guarantor_id
     WHERE m.group_id=$1 ORDER BY (lr.status='pending') DESC, lr.id DESC LIMIT 100`, [req.user.groupId, req.user.id]);
  res.json(rows.map((r) => ({ ...r, guarantor_savings: Number(r.guarantor_savings), needs_two: needsSecondApproval(Number(r.amount), threshold) })));
}));

async function decide(req, res, status) {
  const out = { ok: true };
  await tx(async (c) => {
    const lr = (await c.query(
      `SELECT lr.*, m.language FROM loan_requests lr JOIN members m ON m.id=lr.member_id
       WHERE lr.id=$1 AND m.group_id=$2 FOR UPDATE OF lr`, [req.params.id, req.user.groupId])).rows[0];
    if (!lr) throw httpError(404, 'Loan request not found');
    if (lr.status !== 'pending') throw httpError(409, 'This request has already been decided');
    let loanId = null;
    if (status === 'approved') {
      if (lr.guarantor_id && lr.guarantor_status !== 'accepted') throw httpError(409, 'Waiting for the guarantor to accept this request');
      const threshold = (await c.query('SELECT loan_two_approvals_over AS t FROM groups WHERE id=$1', [req.user.groupId])).rows[0]?.t ?? null;
      if (needsSecondApproval(Number(lr.amount), threshold)) {
        const mine = await c.query('INSERT INTO loan_request_approvals (request_id, officer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [lr.id, req.user.id]);
        const n = (await c.query('SELECT COUNT(*)::int AS n FROM loan_request_approvals WHERE request_id=$1', [lr.id])).rows[0].n;
        if (n < 2) {
          if (!mine.rowCount) throw httpError(409, 'You already approved this. A different officer must approve it too.');
          await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'loanrequest.firstapproval', entity: `loanrequest:${lr.id}`, after: { amount: lr.amount } });
          out.waiting = true;
          return;
        }
      }
      const loan = await issueLoan(c, {
        groupId: req.user.groupId,
        actorId: req.user.id,
        memberId: lr.member_id,
        principal: lr.amount,
        instalments: lr.instalments,
        cycleId: lr.cycle_id,
      });
      loanId = loan.id;
    }
    await c.query('UPDATE loan_requests SET status=$2, decided_by=$3, decided_at=now(), loan_id=$4, note=$5 WHERE id=$1',
      [lr.id, status, req.user.id, loanId, status === 'rejected' ? String(req.body.note || '').slice(0, 200) || null : null]);
    await c.query('INSERT INTO notifications (member_id, body) VALUES ($1,$2)',
      [lr.member_id, t(lr.language, status === 'approved' ? 'loanApproved' : 'loanRejected', { amt: kwacha(lr.amount) })]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: status === 'approved' ? 'loanrequest.approve' : 'loanrequest.reject', entity: `loanrequest:${lr.id}`, after: { amount: lr.amount } });
  });
  res.json(out);
}

// Approving runs the same checks as the officer's loan form (limit, pool, open cycle), so it can still be refused.
loanRequests.post('/:id/approve', requireRole(...OFFICERS), wrap((req, res) => decide(req, res, 'approved')));
loanRequests.post('/:id/reject', requireRole(...OFFICERS), wrap((req, res) => decide(req, res, 'rejected')));

// ---------- announcements ----------
export const announcements = Router();
const WRITERS = ['chairperson', 'treasurer', 'secretary'];

announcements.get('/', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT a.id, a.body, a.created_at, a.sms_sent, m.full_name AS author FROM announcements a JOIN members m ON m.id=a.author_id
     WHERE a.group_id=$1 ORDER BY a.id DESC LIMIT 50`, [req.user.groupId]);
  res.json(rows);
}));

announcements.post('/', requireRole(...WRITERS), wrap(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) throw httpError(400, 'Write the announcement first');
  if (body.length > 300) throw httpError(400, 'Announcements can be at most 300 characters');
  const sms = !!req.body.sms;
  const out = await tx(async (c) => {
    const a = (await c.query('INSERT INTO announcements (group_id, author_id, body, sms_sent) VALUES ($1,$2,$3,$4) RETURNING id', [req.user.groupId, req.user.id, body, sms])).rows[0];
    let sent = 0;
    if (sms) {
      const members = (await c.query("SELECT id FROM members WHERE group_id=$1 AND status='active'", [req.user.groupId])).rows;
      for (const m of members) await c.query('INSERT INTO notifications (member_id, body) VALUES ($1,$2)', [m.id, 'GroupSave: ' + body]);
      sent = members.length;
    }
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'announcement.post', entity: `announcement:${a.id}`, after: { sms, sent } });
    return { id: a.id, sent };
  });
  res.status(201).json(out);
}));

announcements.delete('/:id', requireRole(...WRITERS), wrap(async (req, res) => {
  const { rowCount } = await q('DELETE FROM announcements WHERE id=$1 AND group_id=$2', [req.params.id, req.user.groupId]);
  if (!rowCount) throw httpError(404, 'Announcement not found');
  res.json({ ok: true });
}));
