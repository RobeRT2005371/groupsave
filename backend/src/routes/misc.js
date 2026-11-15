import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { addPosting, audit } from '../ledger.js';
import { smsParts } from '../sms.js';

export const disputes = Router();
export const receipts = Router();
export const auditRoute = Router();

disputes.get('/', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT d.*, m.full_name AS member_name, p.type, p.amount, p.created_at AS posting_date
     FROM disputes d JOIN postings p ON p.id=d.posting_id JOIN cycles c ON c.id=p.cycle_id JOIN members m ON m.id=d.member_id
     WHERE c.group_id=$1 ORDER BY (d.status='open') DESC, d.id DESC`, [req.user.groupId]);
  res.json(rows);
}));

disputes.post('/:id/resolve', requireRole('chairperson'), wrap(async (req, res) => {
  const { status, note } = req.body;
  if (!['upheld', 'rejected'].includes(status)) throw httpError(400, 'Status must be upheld or rejected');
  if (!note) throw httpError(400, 'A resolution note is required');
  await tx(async (c) => {
    const { rows } = await c.query(
      `SELECT d.id FROM disputes d JOIN postings p ON p.id=d.posting_id JOIN cycles cy ON cy.id=p.cycle_id
       WHERE d.id=$1 AND cy.group_id=$2 AND d.status='open' FOR UPDATE OF d`, [req.params.id, req.user.groupId]);
    if (!rows[0]) throw httpError(404, 'Open dispute not found');
    await c.query('UPDATE disputes SET status=$2, resolution_note=$3, resolved_by=$4 WHERE id=$1', [req.params.id, status, note, req.user.id]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'dispute.resolve', entity: `dispute:${req.params.id}`, after: { status, note } });
  });
  res.json({ ok: true });
}));

// ---- Mobile money confirmation matching (officer pastes the SMS text) ----
export function parseReceipt(text) {
  const amt = /(?:ZMW|ZMK|K)\s?([\d,]+(?:\.\d{1,2})?)/i.exec(text);
  const ref = /(?:trans(?:action)?\.?\s*(?:id|ref)?|ref(?:erence)?|txn\s*id|id)[:\s#]*([A-Z0-9]{6,})/i.exec(text);
  return {
    amount: amt ? Math.round(parseFloat(amt[1].replace(/,/g, '')) * 100) : null,
    reference: ref ? ref[1].toUpperCase() : null,
  };
}

receipts.get('/', requireRole('chairperson', 'treasurer'), wrap(async (req, res) => {
  const { rows } = await q('SELECT id, text, amount, reference, matched_posting_id, created_at FROM payment_receipts WHERE group_id=$1 ORDER BY id DESC LIMIT 100', [req.user.groupId]);
  res.json(rows);
}));

receipts.post('/', requireRole('chairperson', 'treasurer'), wrap(async (req, res) => {
  const text = String(req.body.text || '').slice(0, 1000);
  if (!text) throw httpError(400, 'Paste the confirmation text');
  const parsed = parseReceipt(text);
  const amount = Number.isInteger(req.body.amount) ? req.body.amount : parsed.amount;
  const reference = req.body.reference ? String(req.body.reference).toUpperCase() : parsed.reference;
  if (!amount) throw httpError(400, 'Could not read an amount; enter it manually');
  const { rows } = await q('INSERT INTO payment_receipts (group_id,text,amount,reference) VALUES ($1,$2,$3,$4) RETURNING id, amount, reference', [req.user.groupId, text, amount, reference]);
  res.status(201).json(rows[0]);
}));

// Officer confirms which member the payment belongs to; nothing auto-posts.
receipts.post('/:id/match', requireRole('chairperson', 'treasurer'), wrap(async (req, res) => {
  const { memberId, meetingId = null } = req.body;
  const out = await tx(async (c) => {
    const rc = (await c.query('SELECT * FROM payment_receipts WHERE id=$1 AND group_id=$2 FOR UPDATE', [req.params.id, req.user.groupId])).rows[0];
    if (!rc) throw httpError(404, 'Receipt not found');
    if (rc.matched_posting_id) throw httpError(409, 'Already matched');
    const cy = (await c.query("SELECT id FROM cycles WHERE group_id=$1 AND status='open'", [req.user.groupId])).rows[0];
    if (!cy) throw httpError(400, 'No open cycle');
    const m = await c.query('SELECT 1 FROM members WHERE id=$1 AND group_id=$2', [memberId, req.user.groupId]);
    if (!m.rowCount) throw httpError(404, 'Member not found');
    const p = await addPosting(c, { cycleId: cy.id, memberId, meetingId, type: 'contribution', amount: rc.amount, note: `Mobile money ${rc.reference || ''}`.trim(), actorId: req.user.id, groupId: req.user.groupId });
    await c.query('UPDATE payment_receipts SET matched_posting_id=$2, text=NULL WHERE id=$1', [rc.id, p.id]); // keep pasted text only until matched
    return p;
  });
  res.status(201).json(out);
}));


receipts.delete('/:id', requireRole('chairperson', 'treasurer'), wrap(async (req, res) => {
  const { rowCount } = await q('DELETE FROM payment_receipts WHERE id=$1 AND group_id=$2 AND matched_posting_id IS NULL', [req.params.id, req.user.groupId]);
  if (!rowCount) throw httpError(409, 'Receipt not found, or already posted to the ledger');
  await q('INSERT INTO audit_log (group_id, actor, action, entity) VALUES ($1,$2,$3,$4)', [req.user.groupId, req.user.id, 'receipt.delete', `receipt:${req.params.id}`]);
  res.json({ ok: true });
}));

auditRoute.get('/', requireRole('chairperson', 'treasurer', 'secretary'), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT a.id, a.action, a.entity, a.before, a.after, a.created_at, m.full_name AS actor_name
     FROM audit_log a LEFT JOIN members m ON m.id=a.actor WHERE a.group_id=$1 ORDER BY a.id DESC LIMIT 200`, [req.user.groupId]);
  res.json(rows);
}));

// SMS delivery log (officers). Bodies contain amounts only, never names.
export const outbox = Router();
outbox.get('/', requireRole('chairperson', 'treasurer', 'secretary'), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT n.id, n.body, n.status, n.attempts, n.created_at, m.full_name AS member_name
     FROM notifications n JOIN members m ON m.id=n.member_id WHERE m.group_id=$1 ORDER BY n.id DESC LIMIT 200`, [req.user.groupId]);
  res.json(rows);
}));
// How many messages and billable SMS parts this group has used (for the cost estimate).
outbox.get('/usage', requireRole('chairperson', 'treasurer', 'secretary'), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT n.body, n.status, n.created_at FROM notifications n JOIN members m ON m.id=n.member_id WHERE m.group_id=$1`, [req.user.groupId]);
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const out = { messages: 0, parts: 0, monthMessages: 0, monthParts: 0, failed: 0 };
  for (const n of rows) {
    if (n.status === 'failed') { out.failed++; continue; }
    const parts = smsParts(n.body);
    out.messages++; out.parts += parts;
    if (new Date(n.created_at) >= monthStart) { out.monthMessages++; out.monthParts += parts; }
  }
  res.json(out);
}));
outbox.post('/:id/retry', requireRole('chairperson', 'treasurer'), wrap(async (req, res) => {
  const { rowCount } = await q(
    `UPDATE notifications n SET status='pending', attempts=0, next_attempt_at=now() FROM members m
     WHERE n.id=$1 AND m.id=n.member_id AND m.group_id=$2 AND n.status='failed'`, [req.params.id, req.user.groupId]);
  if (!rowCount) throw httpError(404, 'No failed message with that id');
  res.json({ ok: true });
}));

outbox.delete('/:id', requireRole('chairperson', 'treasurer'), wrap(async (req, res) => {
  const { rowCount } = await q(
    `DELETE FROM notifications n USING members m WHERE n.id=$1 AND m.id=n.member_id AND m.group_id=$2 AND n.status <> 'pending'`, [req.params.id, req.user.groupId]);
  if (!rowCount) throw httpError(409, 'Message not found, or still waiting to be sent');
  res.json({ ok: true });
}));
