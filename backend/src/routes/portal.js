import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { q } from '../db.js';
import { config } from '../config.js';
import { decrypt, phoneHash, normalizePhone } from '../security.js';
import { wrap, httpError, signPortalToken } from '../middleware.js';
import { audit } from '../ledger.js';
import { sendSms } from '../sms.js';
import { t, isLang } from '../i18n.js';
import { joinUrl, markJoined } from '../online.js';
import { addPortalMore } from './portal-more.js';
import { addPortalChat } from './chat.js';
import { addPortalExtras } from './extras.js';

const db = { query: q };
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const hashCode = (memberId, code) => crypto.createHash('sha256').update(`${memberId}:${code}:${config.jwtSecret}`).digest('hex');

// ---------- public: sign in with an SMS code ----------
export const portalAuth = Router();

// Always answers the same way so nobody can discover which phone numbers are registered.
portalAuth.post('/request-code', limiter, wrap(async (req, res) => {
  const p = normalizePhone(req.body.phone);
  const m = p && (await q("SELECT * FROM members WHERE phone_hash=$1 AND status='active'", [phoneHash(p)])).rows[0];
  if (m) {
    const recent = (await q("SELECT COUNT(*) AS n FROM member_otps WHERE member_id=$1 AND created_at > now() - interval '1 hour'", [m.id])).rows[0].n;
    if (recent < 3) {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      await q("INSERT INTO member_otps (member_id, code_hash, expires_at) VALUES ($1,$2, now() + interval '10 minutes')", [m.id, hashCode(m.id, code)]);
      await sendSms(decrypt(m.phone_enc), t(m.language, 'otp', { code })).catch((e) => console.error('otp sms', e.message));
    }
  }
  res.json({ ok: true, message: 'If this number belongs to a member, a code has been sent by SMS.' });
}));

portalAuth.post('/verify-code', limiter, wrap(async (req, res) => {
  const p = normalizePhone(req.body.phone);
  const code = String(req.body.code || '').trim();
  const m = p && (await q("SELECT * FROM members WHERE phone_hash=$1 AND status='active'", [phoneHash(p)])).rows[0];
  const bad = () => httpError(401, 'That code is wrong or has expired');
  if (!m || !/^\d{6}$/.test(code)) throw bad();
  const otp = (await q('SELECT * FROM member_otps WHERE member_id=$1 AND NOT used AND expires_at > now() ORDER BY id DESC LIMIT 1', [m.id])).rows[0];
  if (!otp || otp.attempts >= 5) throw bad();
  await q('UPDATE member_otps SET attempts=attempts+1 WHERE id=$1', [otp.id]);
  const a = Buffer.from(hashCode(m.id, code)), b = Buffer.from(otp.code_hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await audit(db, { groupId: m.group_id, actor: m.id, action: 'portal.login.failed', entity: `member:${m.id}` });
    throw bad();
  }
  await q('UPDATE member_otps SET used=true WHERE id=$1', [otp.id]);
  await audit(db, { groupId: m.group_id, actor: m.id, action: 'portal.login.success', entity: `member:${m.id}` });
  res.json({ token: signPortalToken(m), language: m.language });
}));

// Phone + PIN or password sign in. The 4-digit PIN is shared with USSD (and its lockout counter); a password is an optional longer secret for the web portal.
portalAuth.post('/login', limiter, wrap(async (req, res) => {
  const p = normalizePhone(req.body.phone);
  const secret = String(req.body.secret ?? req.body.pin ?? '').trim();
  const m = p && (await q("SELECT * FROM members WHERE phone_hash=$1 AND status='active'", [phoneHash(p)])).rows[0];
  if (m) {
    if (m.pin_failures >= 3) throw httpError(423, 'Too many wrong PINs. Ask an officer to reset your PIN.');
    if (!m.pin_hash && !m.portal_password_hash) throw httpError(409, 'You have not set a PIN yet. Tap "Set my PIN" below.');
    const isPin = /^\d{4}$/.test(secret);
    const ok = isPin ? !!m.pin_hash && (await bcrypt.compare(secret, m.pin_hash))
      : secret.length >= 8 && secret.length <= 72 && !!m.portal_password_hash && (await bcrypt.compare(secret, m.portal_password_hash));
    if (!ok) {
      await q('UPDATE members SET pin_failures=pin_failures+1 WHERE id=$1', [m.id]);
      await audit(db, { groupId: m.group_id, actor: m.id, action: 'portal.login.failed', entity: `member:${m.id}` });
      throw httpError(401, 'Wrong phone number or PIN');
    }
    if (m.pin_failures) await q('UPDATE members SET pin_failures=0 WHERE id=$1', [m.id]);
    await audit(db, { groupId: m.group_id, actor: m.id, action: 'portal.login.success', entity: `member:${m.id}` });
    return res.json({ token: signPortalToken(m), language: m.language });
  }
  const pending = p && (await q(
    "SELECT 1 FROM group_join_requests r JOIN group_applicants a ON a.id=r.applicant_id WHERE a.phone_hash=$1 AND r.status='pending' LIMIT 1",
    [phoneHash(p)])).rows[0];
  if (pending) throw httpError(403, 'Your request to join is still waiting for an officer to approve it. Try again after they approve.');
  throw httpError(401, 'Wrong phone number or PIN');
}));

// A member whose officer has opened PIN setup (24 hours) chooses their own PIN, and optionally a longer password.
portalAuth.post('/set-credentials', limiter, wrap(async (req, res) => {
  const p = normalizePhone(req.body.phone);
  const pin = String(req.body.pin || '').trim();
  const password = String(req.body.password || '');
  if (!/^\d{4}$/.test(pin)) throw httpError(400, 'Choose a PIN of exactly 4 digits');
  if (password && (password.length < 8 || password.length > 72)) throw httpError(400, 'Password must be 8 to 72 characters');
  const m = p && (await q("SELECT * FROM members WHERE phone_hash=$1 AND status='active' AND pin_setup_until > now()", [phoneHash(p)])).rows[0];
  if (!m) throw httpError(403, 'PIN setup is not open for this number. Ask an officer to allow it, then try again.');
  await q('UPDATE members SET pin_hash=$2, portal_password_hash=$3, pin_failures=0, pin_setup_until=NULL WHERE id=$1',
    [m.id, await bcrypt.hash(pin, 10), password ? await bcrypt.hash(password, 10) : null]);
  await audit(db, { groupId: m.group_id, actor: m.id, action: 'portal.credentials.set', entity: `member:${m.id}` });
  res.json({ token: signPortalToken(m), language: m.language });
}));

// ---------- member-only: everything is scoped to the signed-in member ----------
export const portal = Router();

async function currentCycle(groupId) {
  return (await q('SELECT * FROM cycles WHERE group_id=$1 ORDER BY (status=\'open\') DESC, id DESC LIMIT 1', [groupId])).rows[0] || null;
}

portal.get('/me', wrap(async (req, res) => {
  const { rows } = await q('SELECT m.full_name, m.language, g.name AS group_name FROM members m JOIN groups g ON g.id=m.group_id WHERE m.id=$1', [req.user.id]);
  res.json(rows[0]);
}));

portal.get('/summary', wrap(async (req, res) => {
  const cycle = await currentCycle(req.user.groupId);
  if (!cycle) return res.json({ cycle: null });
  const x = (await q(
    `SELECT COALESCE(SUM(amount),0) AS pool,
       COALESCE(SUM(amount) FILTER (WHERE type='contribution'),0) AS total_savings,
       COALESCE(SUM(amount) FILTER (WHERE type='contribution' AND member_id=$2),0) AS savings,
       COALESCE(SUM(amount) FILTER (WHERE type='fine' AND member_id=$2),0) AS fines,
       COALESCE(-SUM(amount) FILTER (WHERE type='payout' AND member_id=$2),0) AS paid_out
     FROM postings WHERE cycle_id=$1`, [cycle.id, req.user.id])).rows[0];
  const loans = (await q(
    `SELECT COALESCE(SUM(s.principal_due + s.interest_due - s.paid_amount),0) AS owed, MIN(s.due_date) FILTER (WHERE s.paid_amount < s.principal_due + s.interest_due) AS next_due
     FROM loans l JOIN schedule_items s ON s.loan_id=l.id WHERE l.member_id=$1 AND l.cycle_id=$2 AND l.status='active'`, [req.user.id, cycle.id])).rows[0];
  const next = loans.next_due && (await q(
    `SELECT s.due_date, s.principal_due + s.interest_due - s.paid_amount AS amount FROM schedule_items s JOIN loans l ON l.id=s.loan_id
     WHERE l.member_id=$1 AND l.cycle_id=$2 AND l.status='active' AND s.paid_amount < s.principal_due + s.interest_due ORDER BY s.due_date LIMIT 1`, [req.user.id, cycle.id])).rows[0];
  const projected = cycle.status === 'open' ? (x.total_savings ? Math.floor((x.pool * x.savings) / x.total_savings) : 0) : x.paid_out;
  res.json({
    cycle: { start_date: cycle.start_date, end_date: cycle.end_date, status: cycle.status },
    savings: x.savings, fines: x.fines, loanOwed: loans.owed, nextPayment: next || null,
    projectedShareout: projected,
    group: { pool: x.pool, totalSavings: x.total_savings }, // totals only, never other members' figures
  });
}));

portal.get('/postings', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT p.id, p.created_at, p.type, p.amount, p.reverses_id, p.running_balance, left(p.hash,4) AS code,
       EXISTS (SELECT 1 FROM postings x WHERE x.reverses_id=p.id) AS reversed,
       (SELECT d.status FROM disputes d WHERE d.posting_id=p.id AND d.member_id=p.member_id ORDER BY d.id DESC LIMIT 1) AS dispute_status
     FROM postings p WHERE p.member_id=$1 ORDER BY p.id DESC LIMIT 200`, [req.user.id]);
  res.json(rows.map((r) => ({ ...r, code: r.code.toUpperCase() })));
}));

portal.get('/loans', wrap(async (req, res) => {
  const loans = (await q('SELECT id, principal, rate_bps, basis, instalments, status, disbursed_at FROM loans WHERE member_id=$1 ORDER BY id DESC', [req.user.id])).rows;
  for (const l of loans) {
    l.schedule = (await q('SELECT seq, due_date, principal_due, interest_due, paid_amount FROM schedule_items WHERE loan_id=$1 ORDER BY seq', [l.id])).rows;
  }
  res.json(loans);
}));

// A member can only query their own entries.
portal.post('/disputes', wrap(async (req, res) => {
  const p = (await q('SELECT id, member_id FROM postings WHERE id=$1', [Number(req.body.postingId)])).rows[0];
  if (!p || p.member_id !== req.user.id) throw httpError(404, 'Entry not found');
  const open = await q("SELECT 1 FROM disputes WHERE posting_id=$1 AND member_id=$2 AND status='open'", [p.id, req.user.id]);
  if (!open.rowCount) {
    await q('INSERT INTO disputes (posting_id, member_id) VALUES ($1,$2)', [p.id, req.user.id]);
    await audit(db, { groupId: req.user.groupId, actor: req.user.id, action: 'dispute.raise', entity: `posting:${p.id}` });
  }
  res.status(201).json({ ok: true });
}));

portal.patch('/language', wrap(async (req, res) => {
  if (!isLang(req.body.language)) throw httpError(400, 'Unknown language');
  await q('UPDATE members SET language=$2 WHERE id=$1', [req.user.id, req.body.language]);
  res.json({ ok: true });
}));

// Online meetings for the member's own group
portal.get('/meetings', wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT mt.id, mt.date, mt.start_time FROM meetings mt JOIN cycles cy ON cy.id=mt.cycle_id
     WHERE cy.group_id=$1 AND mt.online AND mt.date >= CURRENT_DATE - 1
     ORDER BY mt.date, mt.start_time NULLS LAST LIMIT 20`, [req.user.groupId]);
  res.json(rows);
}));

// Only meetings of the member's own group; the private room name is never shown to anyone else.
portal.post('/meetings/:id/join', wrap(async (req, res) => {
  const mt = (await q(
    `SELECT mt.id, mt.room FROM meetings mt JOIN cycles cy ON cy.id=mt.cycle_id
     WHERE mt.id=$1 AND cy.group_id=$2 AND mt.online`, [Number(req.params.id), req.user.groupId])).rows[0];
  if (!mt) throw httpError(404, 'Meeting not found');
  const name = (await q('SELECT full_name FROM members WHERE id=$1', [req.user.id])).rows[0].full_name;
  await markJoined(mt.id, req.user.id);
  res.json({ url: joinUrl(mt.room, name) });
}));

// The SMS messages this member has been sent (receipts, reminders). One-time sign-in codes are not stored here.
portal.get('/messages', wrap(async (req, res) => {
  const { rows } = await q('SELECT id, body, status, created_at FROM notifications WHERE member_id=$1 ORDER BY id DESC LIMIT 50', [req.user.id]);
  res.json(rows);
}));

addPortalMore(portal);
addPortalChat(portal);
addPortalExtras(portal);
