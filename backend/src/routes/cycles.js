import { Router } from 'express';
import { q, tx, pool } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { validateRules, shareOut } from '../rules.js';
import { addPosting, verifyChain, audit } from '../ledger.js';
import { newRoom } from '../online.js';

const r = Router();

async function getCycle(id, groupId) {
  const { rows } = await q(
    'SELECT cy.*, g.type AS group_type FROM cycles cy JOIN groups g ON g.id=cy.group_id WHERE cy.id=$1 AND cy.group_id=$2',
    [id, groupId],
  );
  if (!rows[0]) throw httpError(404, 'Cycle not found');
  return rows[0];
}

export async function memberSavings(db, cycleId, groupId) {
  const { rows } = await db.query(
    `SELECT m.id, m.full_name, m.status,
       COALESCE(SUM(p.amount) FILTER (WHERE p.type='contribution'),0) AS savings,
       COALESCE(SUM(p.amount) FILTER (WHERE p.type='fine'),0) AS fines
     FROM members m LEFT JOIN postings p ON p.member_id=m.id AND p.cycle_id=$1
     WHERE m.group_id=$2 GROUP BY m.id ORDER BY m.id`,
    [cycleId, groupId],
  );
  return rows;
}

async function computeShareout(db, cycle, groupId) {
  const members = await memberSavings(db, cycle.id, groupId);
  const pool_ = (await db.query('SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE cycle_id=$1', [cycle.id])).rows[0].s;
  const weights = members.map((m) =>
    cycle.rules.shareout_basis === 'shares' ? Math.floor(m.savings / cycle.rules.share_price) : m.savings,
  );
  const payouts = shareOut(pool_, weights);
  return { pool: pool_, rows: members.map((m, i) => ({ memberId: m.id, name: m.full_name, savings: m.savings, weight: weights[i], payout: payouts[i] })) };
}

r.get('/', wrap(async (req, res) => {
  const { rows } = await q(
    'SELECT cy.*, g.type AS group_type FROM cycles cy JOIN groups g ON g.id=cy.group_id WHERE cy.group_id=$1 ORDER BY cy.id DESC',
    [req.user.groupId],
  );
  res.json(rows);
}));

r.post('/', requireRole('chairperson'), wrap(async (req, res) => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate || endDate <= startDate) throw httpError(400, 'Valid start and end dates are required');
  let rules;
  try { rules = validateRules(req.body.rules); } catch (e) { throw httpError(400, e.message); }
  const row = await tx(async (c) => {
    const x = await c.query('INSERT INTO cycles (group_id,start_date,end_date,rules) VALUES ($1,$2,$3,$4) RETURNING *', [req.user.groupId, startDate, endDate, rules]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'cycle.open', entity: `cycle:${x.rows[0].id}`, after: rules });
    return x.rows[0];
  });
  res.status(201).json(row);
}));

r.get('/:id/rotation-order', wrap(async (req, res) => {
  const cycle = await getCycle(req.params.id, req.user.groupId);
  const activeMembers = (await q(
    "SELECT id, full_name FROM members WHERE group_id=$1 AND status='active' ORDER BY id",
    [req.user.groupId],
  )).rows;
  const turns = (await q(
    `SELECT rt.member_id, rt.turn_order, m.full_name, m.status,
       paid.amount AS payout_amount, paid.created_at AS payout_date,
       (paid.amount IS NOT NULL) AS received
     FROM rotation_turns rt
     JOIN members m ON m.id=rt.member_id
     LEFT JOIN LATERAL (
       SELECT -p.amount AS amount, p.created_at
       FROM postings p
       WHERE p.cycle_id=rt.cycle_id AND p.member_id=rt.member_id AND p.type='payout'
       ORDER BY p.id LIMIT 1
     ) paid ON true
     WHERE rt.cycle_id=$1 AND m.group_id=$2
     ORDER BY rt.turn_order`,
    [cycle.id, req.user.groupId],
  )).rows;
  const scheduled = new Set(turns.map((turn) => Number(turn.member_id)));
  const missingMembers = activeMembers.filter((member) => !scheduled.has(Number(member.id)));
  const hasPayouts = (await q(
    "SELECT 1 FROM postings WHERE cycle_id=$1 AND type='payout' LIMIT 1",
    [cycle.id],
  )).rowCount > 0;
  const configured = turns.length > 0 && missingMembers.length === 0;
  const allReceived = configured && turns
    .filter((turn) => turn.status === 'active')
    .every((turn) => turn.received);
  res.json({
    groupType: cycle.group_type,
    cycleStatus: cycle.status,
    members: activeMembers,
    turns,
    configured,
    missingMembers,
    hasPayouts,
    allReceived,
  });
}));

r.put('/:id/rotation-order', requireRole('chairperson', 'treasurer'), wrap(async (req, res) => {
  const { memberIds } = req.body;
  if (!Array.isArray(memberIds) || memberIds.some((id) => !Number.isInteger(Number(id)) || Number(id) <= 0)) {
    throw httpError(400, 'Rotation order must be a list of member IDs');
  }
  const order = memberIds.map(Number);
  if (new Set(order).size !== order.length) throw httpError(400, 'A member can only appear once in the rotation order');
  await tx(async (c) => {
    const cycle = (await c.query(
      `SELECT cy.id, cy.status, g.type AS group_type FROM cycles cy
       JOIN groups g ON g.id=cy.group_id WHERE cy.id=$1 AND cy.group_id=$2 FOR UPDATE OF cy`,
      [req.params.id, req.user.groupId],
    )).rows[0];
    if (!cycle) throw httpError(404, 'Cycle not found');
    if (cycle.group_type !== 'rotating') throw httpError(400, 'Only rotating groups have a payout order');
    if (cycle.status !== 'open') throw httpError(400, 'Cycle is closed');
    const members = (await c.query(
      "SELECT id FROM members WHERE group_id=$1 AND status='active' ORDER BY id",
      [req.user.groupId],
    )).rows.map((member) => Number(member.id));
    if (order.length !== members.length || members.some((id) => !order.includes(id))) {
      throw httpError(400, 'The rotation order must include every active member exactly once');
    }
    const existing = (await c.query(
      'SELECT COUNT(*) AS n FROM rotation_turns WHERE cycle_id=$1',
      [cycle.id],
    )).rows[0].n;
    const hasPayouts = (await c.query(
      "SELECT 1 FROM postings WHERE cycle_id=$1 AND type='payout' LIMIT 1",
      [cycle.id],
    )).rowCount > 0;
    if (Number(existing) > 0 && hasPayouts) {
      const savedTurns = (await c.query(
        `SELECT rt.member_id, m.status FROM rotation_turns rt JOIN members m ON m.id=rt.member_id
         WHERE rt.cycle_id=$1 ORDER BY rt.turn_order`,
        [cycle.id],
      )).rows;
      const scheduledIds = new Set(savedTurns.map((turn) => Number(turn.member_id)));
      const existingActive = savedTurns.filter((turn) => turn.status === 'active').map((turn) => Number(turn.member_id));
      const appended = order.filter((id) => !scheduledIds.has(id));
      const expected = [...existingActive, ...appended];
      if (expected.length !== order.length || expected.some((id, index) => id !== order[index])) {
        throw httpError(409, 'Paid turns cannot be reordered; new active members are appended to the existing order');
      }
      const nextOrder = savedTurns.length
        ? Math.max(...savedTurns.map((turn) => Number(turn.turn_order))) + 1
        : 1;
      for (const [index, memberId] of appended.entries()) {
        await c.query(
          'INSERT INTO rotation_turns (cycle_id, member_id, turn_order) VALUES ($1,$2,$3)',
          [cycle.id, memberId, nextOrder + index],
        );
      }
    } else {
      await c.query('DELETE FROM rotation_turns WHERE cycle_id=$1', [cycle.id]);
      for (const [index, memberId] of order.entries()) {
        await c.query(
          'INSERT INTO rotation_turns (cycle_id, member_id, turn_order) VALUES ($1,$2,$3)',
          [cycle.id, memberId, index + 1],
        );
      }
    }
    await audit(c, {
      groupId: req.user.groupId,
      actor: req.user.id,
      action: 'rotation.order.set',
      entity: `cycle:${cycle.id}`,
      after: { memberIds: order },
    });
  });
  res.json({ ok: true });
}));

r.get('/:id/summary', wrap(async (req, res) => {
  const cycle = await getCycle(req.params.id, req.user.groupId);
  const members = await memberSavings(pool, cycle.id, req.user.groupId);
  const tot = (await q(
    `SELECT COALESCE(SUM(amount),0) AS pool,
       COALESCE(SUM(amount) FILTER (WHERE type='contribution'),0) AS contributions,
       COALESCE(SUM(amount) FILTER (WHERE type='fine'),0) AS fines
     FROM postings WHERE cycle_id=$1`, [cycle.id])).rows[0];
  const loans = (await q(
    `SELECT COALESCE(SUM(s.principal_due + s.interest_due - s.paid_amount),0) AS outstanding, COUNT(DISTINCT l.id) AS active
     FROM loans l JOIN schedule_items s ON s.loan_id=l.id WHERE l.cycle_id=$1 AND l.status='active'`, [cycle.id])).rows[0];
  res.json({ cycle, members, ...tot, loansOutstanding: loans.outstanding, activeLoans: Number(loans.active) });
}));

r.get('/:id/meetings', wrap(async (req, res) => {
  await getCycle(req.params.id, req.user.groupId);
  res.json((await q('SELECT id, cycle_id, date, online, start_time FROM meetings WHERE cycle_id=$1 ORDER BY date DESC', [req.params.id])).rows);
}));

r.post('/:id/meetings', requireRole('chairperson', 'treasurer', 'secretary'), wrap(async (req, res) => {
  const cycle = await getCycle(req.params.id, req.user.groupId);
  if (cycle.status !== 'open') throw httpError(400, 'Cycle is closed');
  if (!req.body.date) throw httpError(400, 'Date required');
  const online = !!req.body.online;
  const time = req.body.time || null;
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw httpError(400, 'Time must look like 14:30');
  const { rows } = await q('INSERT INTO meetings (cycle_id,date,recorded_by,online,room,start_time) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, date, online, start_time', [cycle.id, req.body.date, req.user.id, online, online ? newRoom() : null, time]);
  res.status(201).json(rows[0]);
}));

r.get('/:id/verify', wrap(async (req, res) => {
  await getCycle(req.params.id, req.user.groupId);
  res.json(await verifyChain(pool, Number(req.params.id)));
}));

r.get('/:id/shareout', wrap(async (req, res) => {
  const cycle = await getCycle(req.params.id, req.user.groupId);
  if (cycle.group_type === 'rotating') {
    const pool_ = (await q('SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE cycle_id=$1', [cycle.id])).rows[0].s;
    return res.json({ rotating: true, pool: pool_, rows: [] });
  }
  res.json(await computeShareout(pool, cycle, req.user.groupId));
}));

// Close the cycle: all loans must be settled; payouts are posted to the ledger.
r.post('/:id/close', requireRole('chairperson'), wrap(async (req, res) => {
  const result = await tx(async (c) => {
    const cy = await c.query('SELECT * FROM cycles WHERE id=$1 AND group_id=$2 FOR UPDATE', [req.params.id, req.user.groupId]);
    const cycle = cy.rows[0];
    if (!cycle) throw httpError(404, 'Cycle not found');
    if (cycle.status !== 'open') throw httpError(400, 'Cycle already closed');
    const active = await c.query("SELECT 1 FROM loans WHERE cycle_id=$1 AND status='active' LIMIT 1", [cycle.id]);
    if (active.rowCount) throw httpError(400, 'Settle all active loans before closing the cycle');
    const group = (await c.query('SELECT type FROM groups WHERE id=$1', [req.user.groupId])).rows[0];
    let so;
    if (group.type === 'rotating') {
      const missing = await c.query(
        `SELECT m.id FROM members m
         WHERE m.group_id=$1 AND m.status='active'
           AND NOT EXISTS (SELECT 1 FROM rotation_turns rt WHERE rt.cycle_id=$2 AND rt.member_id=m.id)
         LIMIT 1`,
        [req.user.groupId, cycle.id],
      );
      if (missing.rowCount) throw httpError(409, 'Set the rotation order for every active member before closing');
      const unpaid = await c.query(
        `SELECT m.full_name FROM rotation_turns rt JOIN members m ON m.id=rt.member_id
         WHERE rt.cycle_id=$1 AND m.status='active'
           AND NOT EXISTS (SELECT 1 FROM postings p WHERE p.cycle_id=rt.cycle_id AND p.member_id=rt.member_id AND p.type='payout')
         ORDER BY rt.turn_order LIMIT 1`,
        [cycle.id],
      );
      if (unpaid.rowCount) throw httpError(409, `Pay the scheduled turns before closing; ${unpaid.rows[0].full_name} is still waiting`);
      const pool_ = (await c.query('SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE cycle_id=$1', [cycle.id])).rows[0].s;
      so = { pool: pool_, rows: [] };
    } else {
      so = await computeShareout(c, cycle, req.user.groupId);
    }
    for (const row of so.rows) {
      if (row.payout > 0) await addPosting(c, { cycleId: cycle.id, memberId: row.memberId, type: 'payout', amount: -row.payout, actorId: req.user.id, groupId: req.user.groupId });
    }
    await c.query("UPDATE cycles SET status='closed', closed_at=now() WHERE id=$1", [cycle.id]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'cycle.close', entity: `cycle:${cycle.id}`, after: { pool: so.pool } });
    return so;
  });
  res.json(result);
}));


// A cycle can be deleted only if it is empty (no ledger entries or loans), e.g. opened by mistake.
r.delete('/:id', requireRole('chairperson'), wrap(async (req, res) => {
  await tx(async (c) => {
    const cy = (await c.query('SELECT * FROM cycles WHERE id=$1 AND group_id=$2 FOR UPDATE', [req.params.id, req.user.groupId])).rows[0];
    if (!cy) throw httpError(404, 'Cycle not found');
    const used = await c.query('SELECT 1 FROM postings WHERE cycle_id=$1 UNION ALL SELECT 1 FROM loans WHERE cycle_id=$1 LIMIT 1', [cy.id]);
    if (used.rowCount) throw httpError(409, 'This cycle has ledger entries and cannot be deleted. Ledger history is kept permanently.');
    await c.query('DELETE FROM attendance WHERE meeting_id IN (SELECT id FROM meetings WHERE cycle_id=$1)', [cy.id]);
    await c.query('DELETE FROM meetings WHERE cycle_id=$1', [cy.id]);
    await c.query('DELETE FROM cycles WHERE id=$1', [cy.id]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'cycle.delete', entity: `cycle:${cy.id}`, before: cy.rules });
  });
  res.json({ ok: true });
}));

export default r;
