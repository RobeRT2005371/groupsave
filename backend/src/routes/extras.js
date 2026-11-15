import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { audit } from '../ledger.js';
import { paymentStreak, periodDays } from '../rules.js';

const db = { query: q };
const clean = (v, max, what) => {
  const s = String(v ?? '').trim();
  if (!s) throw httpError(400, `${what} is required`);
  if (s.length > max) throw httpError(400, `${what} is too long (${max} characters max)`);
  return s;
};

// ---------- shared helpers ----------
async function pollsFor(groupId, memberId) {
  const polls = (await q('SELECT id, question, options, status, created_at FROM polls WHERE group_id=$1 ORDER BY id DESC LIMIT 30', [groupId])).rows;
  if (!polls.length) return [];
  const ids = polls.map((p) => p.id);
  const counts = (await q('SELECT poll_id, option_idx, COUNT(*)::int AS n FROM poll_votes WHERE poll_id = ANY($1) GROUP BY 1,2', [ids])).rows;
  const mine = (await q('SELECT poll_id, option_idx FROM poll_votes WHERE poll_id = ANY($1) AND member_id=$2', [ids, memberId])).rows;
  return polls.map((p) => {
    const my = mine.find((m) => m.poll_id === p.id);
    const showResults = !!my || p.status === 'closed'; // results stay hidden until you have voted, so nobody is swayed
    const c = p.options.map((_, i) => counts.find((x) => x.poll_id === p.id && x.option_idx === i)?.n || 0);
    return { id: p.id, question: p.question, options: p.options, status: p.status, created_at: p.created_at, myVote: my ? my.option_idx : null,
      counts: showResults ? c : null, total: showResults ? c.reduce((a, b) => a + b, 0) : null };
  });
}

async function castVote(req, res) {
  const idx = Number(req.body.option);
  const p = (await q('SELECT id, options, status FROM polls WHERE id=$1 AND group_id=$2', [Number(req.params.id), req.user.groupId])).rows[0];
  if (!p) throw httpError(404, 'Vote not found');
  if (p.status !== 'open') throw httpError(409, 'This vote is closed');
  if (!Number.isInteger(idx) || idx < 0 || idx >= p.options.length) throw httpError(400, 'Choose one of the options');
  const { rowCount } = await q('INSERT INTO poll_votes (poll_id, member_id, option_idx) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [p.id, req.user.id, idx]);
  if (!rowCount) throw httpError(409, 'You have already voted');
  res.status(201).json({ ok: true });
}

async function leaderboard(groupId) {
  const g = (await q('SELECT show_leaderboard FROM groups WHERE id=$1', [groupId])).rows[0];
  const cycle = (await q("SELECT id, rules FROM cycles WHERE group_id=$1 AND status='open' ORDER BY id DESC LIMIT 1", [groupId])).rows[0];
  if (!cycle) return { enabled: !!g?.show_leaderboard, rows: [] };
  const days = periodDays(cycle.rules.frequency);
  const { rows } = await q(
    `SELECT m.id, m.full_name, COALESCE(array_agg(p.created_at) FILTER (WHERE p.id IS NOT NULL), '{}') AS dates
     FROM members m LEFT JOIN postings p ON p.member_id=m.id AND p.cycle_id=$2 AND p.type='contribution' AND p.amount>0
     WHERE m.group_id=$1 AND m.status='active' AND m.role='member' GROUP BY m.id`, [groupId, cycle.id]);
  const out = rows.map((r) => ({ id: r.id, name: r.full_name, ...paymentStreak(r.dates, days) }))
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));
  return { enabled: !!g?.show_leaderboard, days, rows: out.slice(0, 10) };
}

// ================= officers (/api/extras) =================
export const extras = Router();
const READERS = ['chairperson', 'treasurer', 'secretary', 'auditor'];
const WRITERS = ['chairperson', 'treasurer', 'secretary'];

extras.get('/settings', requireRole(...READERS), wrap(async (req, res) => {
  const g = (await q('SELECT loan_two_approvals_over, show_leaderboard FROM groups WHERE id=$1', [req.user.groupId])).rows[0];
  res.json({ loanTwoApprovalsOver: g.loan_two_approvals_over == null ? null : Number(g.loan_two_approvals_over), showLeaderboard: g.show_leaderboard });
}));
extras.put('/settings', requireRole('chairperson'), wrap(async (req, res) => {
  const { loanTwoApprovalsOver = null, showLeaderboard = false } = req.body;
  if (loanTwoApprovalsOver !== null && (!Number.isInteger(loanTwoApprovalsOver) || loanTwoApprovalsOver <= 0)) throw httpError(400, 'Amount must be positive ngwee');
  await q('UPDATE groups SET loan_two_approvals_over=$2, show_leaderboard=$3 WHERE id=$1', [req.user.groupId, loanTwoApprovalsOver, !!showLeaderboard]);
  await audit(db, { groupId: req.user.groupId, actor: req.user.id, action: 'group.settings', entity: `group:${req.user.groupId}`, after: { loanTwoApprovalsOver, showLeaderboard: !!showLeaderboard } });
  res.json({ ok: true });
}));

extras.get('/leaderboard', requireRole(...READERS), wrap(async (req, res) => res.json(await leaderboard(req.user.groupId))));

// ----- votes -----
extras.get('/polls', requireRole(...READERS), wrap(async (req, res) => res.json(await pollsFor(req.user.groupId, req.user.id))));
extras.post('/polls', requireRole(...WRITERS), wrap(async (req, res) => {
  const question = clean(req.body.question, 200, 'Question');
  const options = (Array.isArray(req.body.options) ? req.body.options : []).map((o) => String(o ?? '').trim()).filter(Boolean);
  if (options.length < 2 || options.length > 6) throw httpError(400, 'Give between 2 and 6 options');
  if (options.some((o) => o.length > 80)) throw httpError(400, 'Options can be at most 80 characters');
  const p = (await q('INSERT INTO polls (group_id, question, options, created_by) VALUES ($1,$2,$3,$4) RETURNING id', [req.user.groupId, question, JSON.stringify(options), req.user.id])).rows[0];
  await audit(db, { groupId: req.user.groupId, actor: req.user.id, action: 'poll.create', entity: `poll:${p.id}` });
  res.status(201).json({ id: p.id });
}));
extras.post('/polls/:id/vote', requireRole(...WRITERS), wrap(castVote));
extras.post('/polls/:id/close', requireRole(...WRITERS), wrap(async (req, res) => {
  const { rowCount } = await q("UPDATE polls SET status='closed' WHERE id=$1 AND group_id=$2 AND status='open'", [Number(req.params.id), req.user.groupId]);
  if (!rowCount) throw httpError(404, 'Open vote not found');
  res.json({ ok: true });
}));

// ----- meeting minutes -----
extras.get('/minutes/:meetingId', requireRole(...READERS), wrap(async (req, res) => {
  const m = (await q(`SELECT mt.minutes, mt.minutes_at, a.full_name AS minutes_by FROM meetings mt JOIN cycles c ON c.id=mt.cycle_id LEFT JOIN members a ON a.id=mt.minutes_by
                     WHERE mt.id=$1 AND c.group_id=$2`, [Number(req.params.meetingId), req.user.groupId])).rows[0];
  if (!m) throw httpError(404, 'Meeting not found');
  res.json(m);
}));
extras.put('/minutes/:meetingId', requireRole('chairperson', 'secretary'), wrap(async (req, res) => {
  const text = String(req.body.minutes ?? '').trim();
  if (text.length > 8000) throw httpError(400, 'Minutes are too long (8000 characters max)');
  const { rowCount } = await q(
    `UPDATE meetings SET minutes=$3, minutes_by=$4, minutes_at=now() WHERE id=$1 AND cycle_id IN (SELECT id FROM cycles WHERE group_id=$2)`,
    [Number(req.params.meetingId), req.user.groupId, text || null, req.user.id]);
  if (!rowCount) throw httpError(404, 'Meeting not found');
  await audit(db, { groupId: req.user.groupId, actor: req.user.id, action: 'meeting.minutes', entity: `meeting:${req.params.meetingId}` });
  res.json({ ok: true });
}));

// ----- reported chat messages (moderation) -----
extras.get('/reports', requireRole('chairperson'), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT r.id, r.message_id, r.message_body, r.reason, r.status, r.created_at, a.full_name AS author_name, rp.full_name AS reporter_name
     FROM chat_reports r JOIN members a ON a.id=r.author_id JOIN members rp ON rp.id=r.reporter_id
     WHERE r.group_id=$1 ORDER BY (r.status='open') DESC, r.id DESC LIMIT 100`, [req.user.groupId]);
  res.json(rows);
}));
extras.post('/reports/:id/dismiss', requireRole('chairperson'), wrap(async (req, res) => {
  const { rowCount } = await q("UPDATE chat_reports SET status='dismissed' WHERE id=$1 AND group_id=$2 AND status='open'", [Number(req.params.id), req.user.groupId]);
  if (!rowCount) throw httpError(404, 'Report not found');
  res.json({ ok: true });
}));
extras.post('/reports/:id/remove', requireRole('chairperson'), wrap(async (req, res) => {
  await tx(async (c) => {
    const r = (await c.query("SELECT message_id FROM chat_reports WHERE id=$1 AND group_id=$2 AND status='open'", [Number(req.params.id), req.user.groupId])).rows[0];
    if (!r) throw httpError(404, 'Report not found');
    await c.query('DELETE FROM group_chat WHERE id=$1 AND group_id=$2', [r.message_id, req.user.groupId]);
    await c.query("UPDATE chat_reports SET status='removed' WHERE message_id=$1 AND status='open'", [r.message_id]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'chat.remove', entity: `message:${r.message_id}` });
  });
  res.json({ ok: true });
}));

// ================= members (mounted in the portal) =================
export function addPortalExtras(portal) {
  // savings goals: progress is the member's savings in the open cycle
  portal.get('/goals', wrap(async (req, res) => {
    const goals = (await q('SELECT id, title, target, created_at FROM member_goals WHERE member_id=$1 ORDER BY id', [req.user.id])).rows;
    const saved = Number((await q(`SELECT COALESCE(SUM(p.amount),0) AS s FROM postings p JOIN cycles c ON c.id=p.cycle_id
      WHERE p.member_id=$1 AND p.type='contribution' AND c.status='open'`, [req.user.id])).rows[0].s);
    res.json({ saved, goals: goals.map((g) => ({ ...g, target: Number(g.target) })) });
  }));
  portal.post('/goals', wrap(async (req, res) => {
    const title = clean(req.body.title, 60, 'Goal name');
    const target = Number(req.body.target);
    if (!Number.isInteger(target) || target <= 0 || target > 100_000_000_00) throw httpError(400, 'Enter a valid target amount');
    if ((await q('SELECT COUNT(*)::int AS n FROM member_goals WHERE member_id=$1', [req.user.id])).rows[0].n >= 10) throw httpError(400, 'You can have at most 10 goals');
    await q('INSERT INTO member_goals (member_id, title, target) VALUES ($1,$2,$3)', [req.user.id, title, target]);
    res.status(201).json({ ok: true });
  }));
  portal.delete('/goals/:id', wrap(async (req, res) => {
    await q('DELETE FROM member_goals WHERE id=$1 AND member_id=$2', [Number(req.params.id), req.user.id]);
    res.json({ ok: true });
  }));

  portal.get('/minutes', wrap(async (req, res) => {
    const { rows } = await q(
      `SELECT mt.id, mt.date, mt.minutes, mt.minutes_at, a.full_name AS minutes_by
       FROM meetings mt JOIN cycles c ON c.id=mt.cycle_id LEFT JOIN members a ON a.id=mt.minutes_by
       WHERE c.group_id=$1 AND mt.minutes IS NOT NULL ORDER BY mt.date DESC, mt.id DESC LIMIT 20`, [req.user.groupId]);
    res.json(rows);
  }));

  portal.get('/polls', wrap(async (req, res) => res.json(await pollsFor(req.user.groupId, req.user.id))));
  portal.post('/polls/:id/vote', wrap(castVote));

  portal.get('/leaderboard', wrap(async (req, res) => {
    const l = await leaderboard(req.user.groupId);
    res.json(l.enabled ? l : { enabled: false, rows: [] });
  }));

  portal.post('/community/:id/report', wrap(async (req, res) => {
    const msg = (await q('SELECT id, sender_id, body FROM group_chat WHERE id=$1 AND group_id=$2', [Number(req.params.id), req.user.groupId])).rows[0];
    if (!msg) throw httpError(404, 'Message not found');
    if (msg.sender_id === req.user.id) throw httpError(400, 'You cannot report your own message');
    await q('INSERT INTO chat_reports (group_id, message_id, message_body, author_id, reporter_id, reason) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
      [req.user.groupId, msg.id, msg.body, msg.sender_id, req.user.id, String(req.body.reason || '').slice(0, 200) || null]);
    res.status(201).json({ ok: true });
  }));
}
