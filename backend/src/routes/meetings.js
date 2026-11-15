import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { addPosting, audit } from '../ledger.js';
import { joinUrl, markJoined } from '../online.js';
import { meetingReminderBody } from '../reminders.js';
import { idempotencyKey, runIdempotently } from '../idempotency.js';

const r = Router();
const OFFICERS = ['chairperson', 'treasurer'];

async function getMeeting(db, id, groupId) {
  const { rows } = await db.query(
    `SELECT mt.*, cy.status AS cycle_status, cy.rules, g.type AS group_type
     FROM meetings mt JOIN cycles cy ON cy.id=mt.cycle_id JOIN groups g ON g.id=cy.group_id WHERE mt.id=$1 AND cy.group_id=$2`, [id, groupId]);
  if (!rows[0]) throw httpError(404, 'Meeting not found');
  return rows[0];
}

r.get('/', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT mt.id, mt.date, mt.cycle_id, mt.online, mt.start_time,
       (SELECT COUNT(*) FROM attendance a WHERE a.meeting_id=mt.id AND a.present) AS present,
       (SELECT COUNT(*) FROM attendance a WHERE a.meeting_id=mt.id AND NOT a.present) AS absent,
       COALESCE((SELECT SUM(amount) FROM postings p WHERE p.meeting_id=mt.id AND p.type='contribution'),0) AS contributions,
       EXISTS (SELECT 1 FROM postings p WHERE p.meeting_id=mt.id AND p.type='payout') AS paid_out
     FROM meetings mt JOIN cycles cy ON cy.id=mt.cycle_id WHERE cy.group_id=$1 ORDER BY mt.date DESC, mt.id DESC LIMIT 100`, [req.user.groupId]);
  res.json(rows.map((m) => ({ ...m, present: Number(m.present), absent: Number(m.absent) })));
}));

r.get('/:id', wrap(async (req, res) => {
  const mt = await getMeeting({ query: q }, req.params.id, req.user.groupId);
  const { rows } = await q(
    `SELECT m.id, m.full_name, a.present, a.fined,
       COALESCE((SELECT SUM(amount) FROM postings p WHERE p.meeting_id=$1 AND p.member_id=m.id AND p.type='contribution'),0) AS contributed
     FROM members m LEFT JOIN attendance a ON a.meeting_id=$1 AND a.member_id=m.id
     WHERE m.group_id=$2 AND m.status='active' ORDER BY m.id`, [mt.id, req.user.groupId]);
  const paid = (await q("SELECT p.member_id, m.full_name, -p.amount AS amount FROM postings p JOIN members m ON m.id=p.member_id WHERE p.meeting_id=$1 AND p.type='payout'", [mt.id])).rows[0] || null;
  let rotation = null;
  if (mt.group_type === 'rotating') {
    const orderCount = (await q('SELECT COUNT(*) AS n FROM rotation_turns WHERE cycle_id=$1', [mt.cycle_id])).rows[0].n;
    const nextTurn = (await q(
      `SELECT rt.member_id, m.full_name, m.status FROM rotation_turns rt
       JOIN members m ON m.id=rt.member_id
       WHERE rt.cycle_id=$1 AND m.status='active'
         AND NOT EXISTS (SELECT 1 FROM postings p WHERE p.cycle_id=rt.cycle_id AND p.member_id=rt.member_id AND p.type='payout')
       ORDER BY rt.turn_order LIMIT 1`,
      [mt.cycle_id],
    )).rows[0] || null;
    rotation = { configured: Number(orderCount) > 0, nextTurn };
  }
  res.json({ meeting: { id: mt.id, date: mt.date, online: mt.online, start_time: mt.start_time, cycle_id: mt.cycle_id, group_type: mt.group_type, cycle_status: mt.cycle_status, fine_absence: mt.rules.fine_absence }, members: rows, paid, rotation });
}));

// Get the private join link for an online meeting (officers of this group only; members use the portal).
r.post('/:id/join', wrap(async (req, res) => {
  const mt = await getMeeting({ query: q }, req.params.id, req.user.groupId);
  if (!mt.online) throw httpError(400, 'This is not an online meeting');
  const name = (await q('SELECT full_name FROM members WHERE id=$1', [req.user.id])).rows[0].full_name;
  await markJoined(mt.id, req.user.id);
  res.json({ url: joinUrl(mt.room, name) });
}));

// SMS every active member about this meeting, in their own language. Limited to once an hour per meeting.
r.post('/:id/remind', requireRole('chairperson', 'treasurer', 'secretary'), wrap(async (req, res) => {
  const sent = await tx(async (c) => {
    const mt = await getMeeting(c, req.params.id, req.user.groupId);
    if (mt.cycle_status !== 'open') throw httpError(400, 'Cycle is closed');
    if (mt.reminded_at && Date.now() - new Date(mt.reminded_at).getTime() < 3600 * 1000) throw httpError(429, 'A reminder was already sent recently');
    const members = (await c.query("SELECT id, language FROM members WHERE group_id=$1 AND status='active'", [req.user.groupId])).rows;
    for (const m of members) {
      await c.query('INSERT INTO notifications (member_id, body) VALUES ($1,$2)', [m.id, meetingReminderBody(m.language, { id: mt.id, date: mt.date, time: mt.start_time, online: mt.online })]);
    }
    await c.query('UPDATE meetings SET reminded_at=now() WHERE id=$1', [mt.id]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'meeting.remind', entity: `meeting:${mt.id}`, after: { members: members.length } });
    return members.length;
  });
  res.json({ sent });
}));

// Record attendance. Members who are absent are fined once (per the cycle's absence fine).
r.post('/:id/attendance', requireRole('chairperson', 'treasurer', 'secretary'), wrap(async (req, res) => {
  if (!Array.isArray(req.body.present) || req.body.present.some((id) => !Number.isInteger(Number(id)))) {
    throw httpError(400, 'Attendance must contain a list of member IDs');
  }
  const present = new Set((req.body.present || []).map(Number));
  const key = idempotencyKey(req);
  const result = await tx(async (c) => {
    return runIdempotently(c, {
      groupId: req.user.groupId, actorId: req.user.id, key, route: 'meeting.attendance',
      action: async () => {
        const mt = await getMeeting(c, req.params.id, req.user.groupId);
        if (mt.cycle_status !== 'open') throw httpError(400, 'Cycle is closed');
        const members = (await c.query("SELECT id FROM members WHERE group_id=$1 AND status='active'", [req.user.groupId])).rows;
        const memberIds = new Set(members.map((m) => Number(m.id)));
        for (const id of present) if (!memberIds.has(id)) throw httpError(400, 'Attendance contains a member outside this group');
        let fined = 0;
        for (const { id } of members) {
          const isPresent = present.has(Number(id));
          const prev = (await c.query('SELECT fined FROM attendance WHERE meeting_id=$1 AND member_id=$2', [mt.id, id])).rows[0];
          let wasFined = prev?.fined || false;
          if (!isPresent && !wasFined && mt.rules.fine_absence > 0) {
            await addPosting(c, { cycleId: mt.cycle_id, memberId: id, meetingId: mt.id, type: 'fine', amount: mt.rules.fine_absence, note: 'Absence', actorId: req.user.id, groupId: req.user.groupId });
            wasFined = true; fined++;
          }
          await c.query(
            `INSERT INTO attendance (meeting_id, member_id, present, fined) VALUES ($1,$2,$3,$4)
             ON CONFLICT (meeting_id, member_id) DO UPDATE SET present=$3, fined=$4`, [mt.id, id, isPresent, wasFined]);
        }
        await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'attendance.record', entity: `meeting:${mt.id}`, after: { present: present.size, fined } });
        return { present: present.size, fined };
      },
    });
  });
  res.json(result);
}));

// Rotating groups: the whole pot collected at this meeting goes to the member whose turn it is.
r.post('/:id/rotation-payout', requireRole(...OFFICERS), wrap(async (req, res) => {
  const out = await tx(async (c) => {
    const mt = await getMeeting(c, req.params.id, req.user.groupId);
    if (mt.group_type !== 'rotating') throw httpError(400, 'Only rotating groups pay out the pot at a meeting');
    if (mt.cycle_status !== 'open') throw httpError(400, 'Cycle is closed');
    await c.query('SELECT id FROM cycles WHERE id=$1 FOR UPDATE', [mt.cycle_id]);
    if ((await c.query("SELECT 1 FROM postings WHERE meeting_id=$1 AND type='payout'", [mt.id])).rowCount) throw httpError(409, 'This meeting already has a payout');
    const missing = await c.query(
      `SELECT 1 FROM members m WHERE m.group_id=$1 AND m.status='active'
       AND NOT EXISTS (SELECT 1 FROM rotation_turns rt WHERE rt.cycle_id=$2 AND rt.member_id=m.id) LIMIT 1`,
      [req.user.groupId, mt.cycle_id],
    );
    if (missing.rowCount) throw httpError(409, 'Update the rotation order to include every active member before paying out');
    const next = (await c.query(
      `SELECT rt.member_id, m.full_name FROM rotation_turns rt
       JOIN members m ON m.id=rt.member_id
       WHERE rt.cycle_id=$1 AND m.group_id=$2 AND m.status='active'
         AND NOT EXISTS (SELECT 1 FROM postings p WHERE p.cycle_id=rt.cycle_id AND p.member_id=rt.member_id AND p.type='payout')
       ORDER BY rt.turn_order LIMIT 1`,
      [mt.cycle_id, req.user.groupId],
    )).rows[0];
    if (!next) throw httpError(409, 'Set a rotation order and ensure the next member has not already received a turn');
    if (req.body.memberId != null && Number(req.body.memberId) !== Number(next.member_id)) {
      throw httpError(409, `The next scheduled recipient is ${next.full_name}`);
    }
    const attendance = (await c.query('SELECT present FROM attendance WHERE meeting_id=$1 AND member_id=$2', [mt.id, next.member_id])).rows[0];
    if (!attendance) throw httpError(409, 'Record attendance before paying out the rotation pot');
    if (!attendance.present) throw httpError(409, 'The next scheduled member is absent; their payout is deferred');
    const pot = (await c.query("SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE meeting_id=$1 AND type='contribution'", [mt.id])).rows[0].s;
    if (pot <= 0) throw httpError(400, 'No contributions recorded for this meeting');
    return addPosting(c, { cycleId: mt.cycle_id, memberId: next.member_id, meetingId: mt.id, type: 'payout', amount: -pot, note: 'Rotation payout', actorId: req.user.id, groupId: req.user.groupId });
  });
  res.status(201).json(out);
}));


// A meeting can be deleted only if nothing was posted against it.
r.delete('/:id', requireRole('chairperson', 'treasurer', 'secretary'), wrap(async (req, res) => {
  await tx(async (c) => {
    const mt = await getMeeting(c, req.params.id, req.user.groupId);
    if ((await c.query('SELECT 1 FROM postings WHERE meeting_id=$1 LIMIT 1', [mt.id])).rowCount) {
      throw httpError(409, 'Entries were recorded at this meeting, so it cannot be deleted. Reverse those entries first.');
    }
    await c.query('DELETE FROM attendance WHERE meeting_id=$1', [mt.id]);
    await c.query('DELETE FROM meetings WHERE id=$1', [mt.id]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'meeting.delete', entity: `meeting:${mt.id}`, before: { date: mt.date } });
  });
  res.json({ ok: true });
}));

export default r;
