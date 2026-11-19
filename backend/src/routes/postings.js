import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { addPosting } from '../ledger.js';
import { reverseLoanPosting } from './loans.js';
import { idempotencyKey, runIdempotently } from '../idempotency.js';

const r = Router();
const OFFICERS = ['chairperson', 'treasurer'];

r.get('/', wrap(async (req, res) => {
  const { cycleId, memberId } = req.query;
  const params = [req.user.groupId];
  let where = 'c.group_id=$1';
  if (cycleId) { params.push(cycleId); where += ` AND p.cycle_id=$${params.length}`; }
  if (memberId) { params.push(memberId); where += ` AND p.member_id=$${params.length}`; }
  const { rows } = await q(
    `SELECT p.id, p.cycle_id, p.member_id, m.full_name AS member_name, p.type, p.amount, p.reverses_id, p.note,
            o.full_name AS recorded_by_name, p.created_at, p.running_balance, p.hash,
            EXISTS (SELECT 1 FROM postings x WHERE x.reverses_id=p.id) AS reversed
     FROM postings p JOIN cycles c ON c.id=p.cycle_id JOIN members m ON m.id=p.member_id JOIN members o ON o.id=p.recorded_by
     WHERE ${where} ORDER BY p.id DESC LIMIT 500`, params);
  res.json(rows);
}));

// Manual entries are contributions and fines; loans have their own endpoints.
r.post('/', requireRole(...OFFICERS), wrap(async (req, res) => {
  const { cycleId, memberId, meetingId = null, type, amount, note = null } = req.body;
  if (!['contribution', 'fine'].includes(type)) throw httpError(400, 'Type must be contribution or fine');
  if (meetingId !== null && !Number.isInteger(Number(meetingId))) throw httpError(400, 'Invalid meeting');
  if (!Number.isInteger(amount) || amount <= 0) throw httpError(400, 'Amount must be a positive whole number of ngwee');
  const key = type === 'contribution' ? idempotencyKey(req) : null;
  const posting = await tx(async (c) => {
    return runIdempotently(c, {
      groupId: req.user.groupId, actorId: req.user.id, key, route: 'posting.contribution',
      action: async () => {
        const cy = await c.query('SELECT status FROM cycles WHERE id=$1 AND group_id=$2', [cycleId, req.user.groupId]);
        if (!cy.rows[0]) throw httpError(404, 'Cycle not found');
        if (cy.rows[0].status !== 'open') throw httpError(400, 'Cycle is closed');
        const m = await c.query("SELECT 1 FROM members WHERE id=$1 AND group_id=$2", [memberId, req.user.groupId]);
        if (!m.rowCount) throw httpError(404, 'Member not found');
        if (meetingId !== null) {
          const mt = await c.query('SELECT 1 FROM meetings WHERE id=$1 AND cycle_id=$2', [meetingId, cycleId]);
          if (!mt.rowCount) throw httpError(400, 'Meeting does not belong to this cycle');
        }
        return addPosting(c, { cycleId, memberId, meetingId, type, amount, note, actorId: req.user.id, groupId: req.user.groupId });
      },
    });
  });
  res.status(201).json(posting);
}));

// Corrections are reversing entries; history is never edited.
r.post('/:id/reverse', requireRole(...OFFICERS), wrap(async (req, res) => {
  const posting = await tx(async (c) => {
    const o = await c.query(
      'SELECT p.*, cy.status AS cycle_status FROM postings p JOIN cycles cy ON cy.id=p.cycle_id WHERE p.id=$1 AND cy.group_id=$2',
      [req.params.id, req.user.groupId]);
    const orig = o.rows[0];
    if (!orig) throw httpError(404, 'Posting not found');
    if (orig.cycle_status !== 'open') throw httpError(400, 'Cycle is closed');
    if (orig.reverses_id) throw httpError(400, 'A reversal cannot be reversed; post a new entry');
    if (!['contribution', 'fine', 'loan_disbursement', 'loan_repayment'].includes(orig.type)) throw httpError(400, 'Share-out payouts cannot be reversed');
    if ((await c.query('SELECT 1 FROM postings WHERE reverses_id=$1', [orig.id])).rowCount) throw httpError(409, 'Already reversed');
    if (orig.type.startsWith('loan_')) return reverseLoanPosting(c, { groupId: req.user.groupId, actorId: req.user.id, orig, reason: req.body.reason });
    return addPosting(c, {
      cycleId: orig.cycle_id, memberId: orig.member_id, type: orig.type, amount: -orig.amount, reversesId: orig.id,
      note: req.body.reason || 'Reversal', actorId: req.user.id, groupId: req.user.groupId,
    });
  });
  res.status(201).json(posting);
}));

export default r;
