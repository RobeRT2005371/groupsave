import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { q, tx } from '../db.js';
import { encrypt, decrypt, phoneHash, normalizePhone, newTotpSecret, verifyTotp } from '../security.js';
import { wrap, httpError, signToken, authenticate } from '../middleware.js';
import { audit } from '../ledger.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
const db = { query: q };

export function checkPassword(pw) {
  if (!pw || pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw httpError(400, 'Password must be at least 8 characters with letters and numbers');
}

r.post('/register-group', limiter, wrap(async (req, res) => {
  const { groupName, type = 'accumulating', location = '', name, phone, password } = req.body;
  const p = normalizePhone(phone);
  if (!groupName || !name || !p) throw httpError(400, 'Group name, your name and a valid phone are required');
  if (!['accumulating', 'rotating'].includes(type)) throw httpError(400, 'Bad group type');
  checkPassword(password);
  const member = await tx(async (c) => {
    const g = await c.query('INSERT INTO groups (name,type,location) VALUES ($1,$2,$3) RETURNING id', [groupName, type, location]);
    const m = await c.query(
      `INSERT INTO members (group_id,full_name,phone_enc,phone_hash,password_hash,role)
       VALUES ($1,$2,$3,$4,$5,'chairperson') RETURNING id, group_id, role, full_name`,
      [g.rows[0].id, name, encrypt(p), phoneHash(p), await bcrypt.hash(password, 12)],
    );
    await audit(c, { groupId: g.rows[0].id, actor: m.rows[0].id, action: 'group.create', entity: `group:${g.rows[0].id}` });
    return m.rows[0];
  });
  res.status(201).json({ token: signToken(member), user: member });
}));

r.post('/login', limiter, wrap(async (req, res) => {
  const p = normalizePhone(req.body.phone);
  const { rows } = await q('SELECT * FROM members WHERE phone_hash=$1 AND password_hash IS NOT NULL AND status=$2', [p && phoneHash(p), 'active']);
  const m = rows[0];
  if (m?.locked_until && new Date(m.locked_until) > new Date()) {
    throw httpError(429, `Account locked after too many failed attempts. Try again in ${Math.ceil((new Date(m.locked_until) - Date.now()) / 60000)} minutes.`);
  }
  const fail = async (msg) => {
    if (m) {
      const n = m.failed_logins + 1;
      await q(
        `UPDATE members SET failed_logins=$2::int, locked_until=CASE WHEN $2::int >= $3::int THEN now() + make_interval(mins => $4::int) ELSE locked_until END WHERE id=$1`,
        [m.id, n, MAX_FAILS, LOCK_MINUTES],
      );
      await audit(db, { groupId: m.group_id, actor: m.id, action: 'login.failed', entity: `member:${m.id}` });
    }
    throw httpError(401, msg);
  };
  // Always run a bcrypt compare so response time does not reveal which phones exist.
  const ok = await bcrypt.compare(req.body.password || '', m?.password_hash || DUMMY_HASH);
  if (!m || !ok) return fail('Wrong phone or password');
  if (m.totp_enabled) {
    if (!req.body.code) return res.status(401).json({ error: 'Enter the 6-digit code from your authenticator app', needs2fa: true });
    if (!verifyTotp(decrypt(m.totp_secret), req.body.code)) return fail('Invalid authenticator code');
  }
  await q('UPDATE members SET failed_logins=0, locked_until=NULL WHERE id=$1', [m.id]);
  await audit(db, { groupId: m.group_id, actor: m.id, action: 'login.success', entity: `member:${m.id}` });
  res.json({ token: signToken(m), user: { id: m.id, group_id: m.group_id, role: m.role, full_name: m.full_name } });
}));

r.get('/me', authenticate, wrap(async (req, res) => {
  const { rows } = await q(
    'SELECT m.id, m.full_name, m.role, m.totp_enabled, g.id AS group_id, g.name AS group_name, g.type AS group_type FROM members m JOIN groups g ON g.id=m.group_id WHERE m.id=$1',
    [req.user.id],
  );
  res.json(rows[0]);
}));

r.post('/password', authenticate, limiter, wrap(async (req, res) => {
  const { current, next } = req.body;
  checkPassword(next);
  const m = (await q('SELECT * FROM members WHERE id=$1', [req.user.id])).rows[0];
  if (!(await bcrypt.compare(current || '', m.password_hash))) throw httpError(401, 'Current password is wrong');
  await q('UPDATE members SET password_hash=$2 WHERE id=$1', [m.id, await bcrypt.hash(next, 12)]);
  await audit(db, { groupId: m.group_id, actor: m.id, action: 'password.change', entity: `member:${m.id}` });
  res.json({ ok: true });
}));

// Two-factor: setup returns a secret to scan; it only turns on once a valid code is confirmed.
r.post('/2fa/setup', authenticate, wrap(async (req, res) => {
  const m = (await q('SELECT totp_enabled, full_name FROM members WHERE id=$1', [req.user.id])).rows[0];
  if (m.totp_enabled) throw httpError(400, 'Two-factor is already on');
  const secret = newTotpSecret();
  await q('UPDATE members SET totp_secret=$2 WHERE id=$1', [req.user.id, encrypt(secret)]);
  res.json({ secret, uri: `otpauth://totp/GroupSave%20ZM:${encodeURIComponent(m.full_name)}?secret=${secret}&issuer=GroupSave%20ZM` });
}));

r.post('/2fa/enable', authenticate, limiter, wrap(async (req, res) => {
  const m = (await q('SELECT totp_secret FROM members WHERE id=$1', [req.user.id])).rows[0];
  if (!m.totp_secret) throw httpError(400, 'Start setup first');
  if (!verifyTotp(decrypt(m.totp_secret), req.body.code)) throw httpError(400, 'That code is not valid. Check your phone clock and try again.');
  await q('UPDATE members SET totp_enabled=true WHERE id=$1', [req.user.id]);
  await audit(db, { groupId: req.user.groupId, actor: req.user.id, action: '2fa.enable', entity: `member:${req.user.id}` });
  res.json({ ok: true });
}));

r.post('/2fa/disable', authenticate, limiter, wrap(async (req, res) => {
  const m = (await q('SELECT * FROM members WHERE id=$1', [req.user.id])).rows[0];
  if (!(await bcrypt.compare(req.body.password || '', m.password_hash))) throw httpError(401, 'Password is wrong');
  if (m.totp_enabled && !verifyTotp(decrypt(m.totp_secret), req.body.code)) throw httpError(400, 'Invalid authenticator code');
  await q('UPDATE members SET totp_enabled=false, totp_secret=NULL WHERE id=$1', [m.id]);
  await audit(db, { groupId: m.group_id, actor: m.id, action: '2fa.disable', entity: `member:${m.id}` });
  res.json({ ok: true });
}));

export default r;
