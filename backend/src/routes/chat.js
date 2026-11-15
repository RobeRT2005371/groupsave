import { Router } from 'express';
import { q } from '../db.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { t } from '../i18n.js';

const OFFICERS = ['chairperson', 'treasurer', 'secretary'];
const cleanBody = (b) => {
  const s = String(b || '').trim();
  if (!s) throw httpError(400, 'Write a message first');
  if (s.length > 1000) throw httpError(400, 'Message is too long (1000 characters max)');
  return s;
};

// ---------- officers ----------
export const chat = Router();
chat.use(requireRole(...OFFICERS));

chat.get('/unread', wrap(async (req, res) => {
  const n = (await q('SELECT COUNT(*)::int AS n FROM chat_messages WHERE group_id=$1 AND NOT from_officer AND read_at IS NULL', [req.user.groupId])).rows[0].n;
  res.json({ unread: n });
}));

// The group's open chat room, shared by members and officers.
chat.get('/community', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT g.id, g.body, g.created_at, g.sender_id, (g.sender_id=$2) AS mine, s.full_name AS sender_name
     FROM group_chat g JOIN members s ON s.id=g.sender_id WHERE g.group_id=$1 ORDER BY g.id DESC LIMIT 200`, [req.user.groupId, req.user.id]);
  res.json(rows.reverse());
}));
chat.post('/community', wrap(async (req, res) => {
  await q('INSERT INTO group_chat (group_id, sender_id, body) VALUES ($1,$2,$3)', [req.user.groupId, req.user.id, cleanBody(req.body.body)]);
  res.status(201).json({ ok: true });
}));
// Only the chairperson can remove other people's messages (moderation).
chat.delete('/community/:id', requireRole('chairperson'), wrap(async (req, res) => {
  await q('DELETE FROM group_chat WHERE id=$1 AND group_id=$2', [Number(req.params.id), req.user.groupId]);
  res.json({ ok: true });
}));

// Every active member with their latest message and how many of theirs are unread.
chat.get('/', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT m.id, m.full_name,
            (SELECT body FROM chat_messages c WHERE c.member_id=m.id ORDER BY id DESC LIMIT 1) AS last_body,
            (SELECT created_at FROM chat_messages c WHERE c.member_id=m.id ORDER BY id DESC LIMIT 1) AS last_at,
            (SELECT COUNT(*) FROM chat_messages c WHERE c.member_id=m.id AND NOT c.from_officer AND c.read_at IS NULL)::int AS unread
     FROM members m WHERE m.group_id=$1 AND m.status='active' AND m.role='member'
     ORDER BY unread DESC, last_at DESC NULLS LAST, m.full_name`, [req.user.groupId]);
  res.json(rows);
}));

async function memberOf(req) {
  const m = (await q('SELECT id, full_name FROM members WHERE id=$1 AND group_id=$2', [Number(req.params.memberId), req.user.groupId])).rows[0];
  if (!m) throw httpError(404, 'Member not found');
  return m;
}

chat.get('/:memberId', wrap(async (req, res) => {
  const m = await memberOf(req);
  await q('UPDATE chat_messages SET read_at=now() WHERE member_id=$1 AND NOT from_officer AND read_at IS NULL', [m.id]);
  const { rows } = await q(
    `SELECT c.id, c.body, c.from_officer, c.created_at, s.full_name AS sender_name
     FROM chat_messages c JOIN members s ON s.id=c.sender_id WHERE c.member_id=$1 ORDER BY c.id DESC LIMIT 200`, [m.id]);
  res.json({ member: m, messages: rows.reverse() });
}));

chat.post('/:memberId', wrap(async (req, res) => {
  const m = await memberOf(req);
  const body = cleanBody(req.body.body);
  await q('INSERT INTO chat_messages (group_id, member_id, sender_id, from_officer, body) VALUES ($1,$2,$3,true,$4)', [req.user.groupId, m.id, req.user.id, body]);
  // One SMS per conversation until the member reads it (no spam while an officer sends several replies).
  const pending = (await q('SELECT COUNT(*)::int AS n FROM chat_messages WHERE member_id=$1 AND from_officer AND read_at IS NULL', [m.id])).rows[0].n;
  if (pending === 1) {
    const lang = (await q('SELECT language FROM members WHERE id=$1', [m.id])).rows[0]?.language || 'en';
    await q('INSERT INTO notifications (member_id, body) VALUES ($1,$2)', [m.id, t(lang, 'replyNotice')]);
  }
  res.status(201).json({ ok: true });
}));

// ---------- members (mounted inside the portal) ----------
export function addPortalChat(portal) {
  portal.get('/chat', wrap(async (req, res) => {
    await q('UPDATE chat_messages SET read_at=now() WHERE member_id=$1 AND from_officer AND read_at IS NULL', [req.user.id]);
    const { rows } = await q(
      `SELECT c.id, c.body, c.from_officer, c.created_at, s.full_name AS sender_name
       FROM chat_messages c JOIN members s ON s.id=c.sender_id WHERE c.member_id=$1 ORDER BY c.id DESC LIMIT 200`, [req.user.id]);
    res.json(rows.reverse());
  }));

  portal.get('/chat/unread', wrap(async (req, res) => {
    const n = (await q('SELECT COUNT(*)::int AS n FROM chat_messages WHERE member_id=$1 AND from_officer AND read_at IS NULL', [req.user.id])).rows[0].n;
    const d = (await q('SELECT COUNT(*)::int AS n FROM direct_messages WHERE recipient_id=$1 AND read_at IS NULL', [req.user.id])).rows[0].n;
    res.json({ unread: n + d, officers: n, direct: d });
  }));

  // ---- group room ----
  portal.get('/community', wrap(async (req, res) => {
    const { rows } = await q(
      `SELECT g.id, g.body, g.created_at, (g.sender_id=$2) AS mine, s.full_name AS sender_name
       FROM group_chat g JOIN members s ON s.id=g.sender_id WHERE g.group_id=$1 ORDER BY g.id DESC LIMIT 200`, [req.user.groupId, req.user.id]);
    res.json(rows.reverse());
  }));
  portal.post('/community', wrap(async (req, res) => {
    await q('INSERT INTO group_chat (group_id, sender_id, body) VALUES ($1,$2,$3)', [req.user.groupId, req.user.id, cleanBody(req.body.body)]);
    res.status(201).json({ ok: true });
  }));
  portal.delete('/community/:id', wrap(async (req, res) => {
    const { rowCount } = await q('DELETE FROM group_chat WHERE id=$1 AND sender_id=$2', [Number(req.params.id), req.user.id]);
    if (!rowCount) throw httpError(404, 'You can only delete your own messages');
    res.json({ ok: true });
  }));

  // ---- private one-to-one messages between members ----
  portal.get('/people', wrap(async (req, res) => {
    const { rows } = await q(
      `SELECT m.id, m.full_name,
              (SELECT body FROM direct_messages d WHERE (d.sender_id=m.id AND d.recipient_id=$2) OR (d.sender_id=$2 AND d.recipient_id=m.id) ORDER BY id DESC LIMIT 1) AS last_body,
              (SELECT created_at FROM direct_messages d WHERE (d.sender_id=m.id AND d.recipient_id=$2) OR (d.sender_id=$2 AND d.recipient_id=m.id) ORDER BY id DESC LIMIT 1) AS last_at,
              (SELECT COUNT(*) FROM direct_messages d WHERE d.sender_id=m.id AND d.recipient_id=$2 AND d.read_at IS NULL)::int AS unread
       FROM members m WHERE m.group_id=$1 AND m.status='active' AND m.role='member' AND m.id<>$2
       ORDER BY unread DESC, last_at DESC NULLS LAST, m.full_name`, [req.user.groupId, req.user.id]);
    res.json(rows);
  }));

  const peer = async (req) => {
    const p = (await q("SELECT id, full_name FROM members WHERE id=$1 AND group_id=$2 AND status='active' AND role='member' AND id<>$3", [Number(req.params.id), req.user.groupId, req.user.id])).rows[0];
    if (!p) throw httpError(404, 'Member not found');
    return p;
  };
  portal.get('/dm/:id', wrap(async (req, res) => {
    const p = await peer(req);
    await q('UPDATE direct_messages SET read_at=now() WHERE sender_id=$1 AND recipient_id=$2 AND read_at IS NULL', [p.id, req.user.id]);
    const { rows } = await q(
      `SELECT d.id, d.body, d.created_at, (d.sender_id=$2) AS mine, s.full_name AS sender_name
       FROM direct_messages d JOIN members s ON s.id=d.sender_id
       WHERE (d.sender_id=$1 AND d.recipient_id=$2) OR (d.sender_id=$2 AND d.recipient_id=$1) ORDER BY d.id DESC LIMIT 200`, [p.id, req.user.id]);
    res.json({ person: p, messages: rows.reverse() });
  }));
  portal.post('/dm/:id', wrap(async (req, res) => {
    const p = await peer(req);
    await q('INSERT INTO direct_messages (group_id, sender_id, recipient_id, body) VALUES ($1,$2,$3,$4)', [req.user.groupId, req.user.id, p.id, cleanBody(req.body.body)]);
    res.status(201).json({ ok: true });
  }));

  portal.post('/chat', wrap(async (req, res) => {
    const body = cleanBody(req.body.body);
    await q('INSERT INTO chat_messages (group_id, member_id, sender_id, from_officer, body) VALUES ($1,$2,$2,false,$3)', [req.user.groupId, req.user.id, body]);
    res.status(201).json({ ok: true });
  }));
}
