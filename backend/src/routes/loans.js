import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { addPosting, audit } from '../ledger.js';
import { buildSchedule, allocateRepayment, loanLimit } from '../rules.js';

/** Check limits and pay out a loan. Must run inside a transaction. Used by the officer form and by loan-request approval. */
export async function issueLoan(c, { groupId, actorId, memberId, principal, instalments, cycleId = null }) {
  const cy = await c.query(
    "SELECT * FROM cycles WHERE group_id=$1 AND status='open' AND ($2::int IS NULL OR id=$2) FOR UPDATE",
    [groupId, cycleId],
  );
  const cycle = cy.rows[0];
  if (!cycle) throw httpError(400, 'No open cycle');
  const m = await c.query('SELECT status FROM members WHERE id=$1 AND group_id=$2', [memberId, groupId]);
  if (!m.rows[0] || m.rows[0].status !== 'active') throw httpError(400, 'Member not found or not active');
  const rules = cycle.rules;
  const sav = (await c.query("SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE cycle_id=$1 AND member_id=$2 AND type='contribution'", [cycle.id, memberId])).rows[0].s;
  const owed = (await c.query(
    `SELECT COALESCE(SUM(s.principal_due - LEAST(s.paid_amount, s.principal_due)),0) AS o FROM loans l JOIN schedule_items s ON s.loan_id=l.id
     WHERE l.cycle_id=$1 AND l.member_id=$2 AND l.status='active'`, [cycle.id, memberId])).rows[0].o;
  const limit = loanLimit(sav, rules.loan_limit_multiple) - owed;
  if (principal > limit) throw httpError(400, `Above this member's loan limit (${limit} ngwee available)`);
  const pool = (await c.query('SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE cycle_id=$1', [cycle.id])).rows[0].s;
  if (principal > pool) throw httpError(400, `The pool only holds ${pool} ngwee`);
  const l = (await c.query(
    `INSERT INTO loans (cycle_id,member_id,principal,rate_bps,basis,instalments,disbursed_at,approved_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [cycle.id, memberId, principal, rules.interest_bps, rules.interest_basis, instalments, today(), actorId])).rows[0];
  const items = buildSchedule({ principal, rateBps: rules.interest_bps, basis: rules.interest_basis, instalments, startDate: l.disbursed_at, frequency: rules.frequency });
  for (const it of items) {
    await c.query('INSERT INTO schedule_items (loan_id,seq,due_date,principal_due,interest_due) VALUES ($1,$2,$3,$4,$5)', [l.id, it.seq, it.dueDate, it.principalDue, it.interestDue]);
  }
  await addPosting(c, { cycleId: cycle.id, memberId, type: 'loan_disbursement', amount: -principal, note: `Loan ${l.id}`, actorId: actorId, groupId: groupId });
  await audit(c, { groupId: groupId, actor: actorId, action: 'loan.disburse', entity: `loan:${l.id}`, after: { principal, instalments } });
  return l;
}

const r = Router();
const OFFICERS = ['chairperson', 'treasurer'];
const today = () => new Date().toISOString().slice(0, 10);

r.get('/', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT l.*, m.full_name AS member_name,
       COALESCE(SUM(s.principal_due + s.interest_due - s.paid_amount),0) AS outstanding,
       MIN(s.due_date) FILTER (WHERE s.paid_amount < s.principal_due + s.interest_due) AS next_due,
       COUNT(*) FILTER (WHERE s.paid_amount < s.principal_due + s.interest_due AND s.due_date < CURRENT_DATE) AS overdue_items
     FROM loans l JOIN cycles c ON c.id=l.cycle_id JOIN members m ON m.id=l.member_id
     LEFT JOIN schedule_items s ON s.loan_id=l.id
     WHERE c.group_id=$1 GROUP BY l.id, m.full_name ORDER BY l.id DESC`, [req.user.groupId]);
  res.json(rows.map((l) => ({ ...l, overdue_items: Number(l.overdue_items) })));
}));

r.get('/:id/schedule', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT s.* FROM schedule_items s JOIN loans l ON l.id=s.loan_id JOIN cycles c ON c.id=l.cycle_id
     WHERE l.id=$1 AND c.group_id=$2 ORDER BY s.seq`, [req.params.id, req.user.groupId]);
  res.json(rows);
}));

r.post('/', requireRole(...OFFICERS), wrap(async (req, res) => {
  const { memberId, principal, instalments } = req.body;
  if (!Number.isInteger(principal) || principal <= 0) throw httpError(400, 'Principal must be positive ngwee');
  if (!Number.isInteger(instalments) || instalments < 1 || instalments > 60) throw httpError(400, 'Instalments must be 1-60');
  const loan = await tx((c) => issueLoan(c, { groupId: req.user.groupId, actorId: req.user.id, memberId, principal, instalments }));
  res.status(201).json(loan);
}));

/** Apply a repayment to a loan's instalments and post it to the ledger. Must run inside a transaction. */
export async function recordRepayment(c, { groupId, actorId, loanId, amount, note = null }) {
  const lr = await c.query(
    `SELECT l.* FROM loans l JOIN cycles cy ON cy.id=l.cycle_id WHERE l.id=$1 AND cy.group_id=$2 AND cy.status='open' FOR UPDATE OF l`,
    [loanId, groupId]);
  const loan = lr.rows[0];
  if (!loan) throw httpError(404, 'Loan not found or cycle closed');
  if (loan.status !== 'active') throw httpError(400, 'Loan already settled');
  const items = (await c.query('SELECT * FROM schedule_items WHERE loan_id=$1 ORDER BY seq', [loan.id])).rows;
  const { changes, leftover } = allocateRepayment(items, amount);
  if (leftover > 0) throw httpError(400, `Amount exceeds what is owed by ${leftover} ngwee`);
  for (const ch of changes) await c.query('UPDATE schedule_items SET paid_amount=paid_amount+$2, paid_at=$3 WHERE id=$1', [ch.id, ch.paid, today()]);
  const left = (await c.query('SELECT COUNT(*) AS n FROM schedule_items WHERE loan_id=$1 AND paid_amount < principal_due + interest_due', [loan.id])).rows[0].n;
  if (Number(left) === 0) await c.query("UPDATE loans SET status='settled' WHERE id=$1", [loan.id]);
  return addPosting(c, { cycleId: loan.cycle_id, memberId: loan.member_id, type: 'loan_repayment', amount, note: note || `Loan ${loan.id}`, actorId, groupId });
}

r.post('/:id/repay', requireRole(...OFFICERS), wrap(async (req, res) => {
  const { amount } = req.body;
  if (!Number.isInteger(amount) || amount <= 0) throw httpError(400, 'Amount must be positive ngwee');
  await tx((c) => recordRepayment(c, { groupId: req.user.groupId, actorId: req.user.id, loanId: req.params.id, amount }));
  res.json({ ok: true });
}));

// Post the cycle's late-payment fine once per overdue instalment.
r.post('/late-fines', requireRole(...OFFICERS), wrap(async (req, res) => {
  const n = await tx(async (c) => {
    const cy = (await c.query("SELECT * FROM cycles WHERE group_id=$1 AND status='open'", [req.user.groupId])).rows[0];
    if (!cy) throw httpError(400, 'No open cycle');
    if (!cy.rules.fine_late) return 0;
    const due = (await c.query(
      `SELECT s.id, l.member_id FROM schedule_items s JOIN loans l ON l.id=s.loan_id
       WHERE l.cycle_id=$1 AND l.status='active' AND s.due_date < CURRENT_DATE AND s.paid_amount < s.principal_due + s.interest_due AND NOT s.late_fined FOR UPDATE OF s`, [cy.id])).rows;
    for (const d of due) {
      await addPosting(c, { cycleId: cy.id, memberId: d.member_id, type: 'fine', amount: cy.rules.fine_late, note: 'Late repayment', actorId: req.user.id, groupId: req.user.groupId });
      await c.query('UPDATE schedule_items SET late_fined=true WHERE id=$1', [d.id]);
    }
    return due.length;
  });
  res.json({ fined: n });
}));

export default r;
