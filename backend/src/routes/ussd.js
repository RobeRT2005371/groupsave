import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { q } from '../db.js';
import { config } from '../config.js';
import { phoneHash, normalizePhone } from '../security.js';
import { kwacha } from '../rules.js';
import { t, languageMenu, langFromChoice } from '../i18n.js';

const r = Router();
const CON = (s) => `CON ${s}`;
const END = (s) => `END ${s}`;

const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

async function handle({ phoneNumber, text }) {
  const phone = normalizePhone(phoneNumber);
  const { rows } = await q('SELECT * FROM members WHERE phone_hash=$1', [phone && phoneHash(phone)]);
  const m = rows[0];
  if (!m || m.status !== 'active') return END(t('en', 'notReg'));
  let L = m.language;
  if (m.pin_failures >= 3) return END(t(L, 'locked'));

  let parts = text ? text.split('*') : [];

  // First use: choose language, then choose a PIN (officers never see it).
  if (!m.pin_hash) {
    if (parts.length === 0) return CON(languageMenu());
    const chosen = langFromChoice(parts[0]);
    if (!chosen) return END(t('en', 'invalid'));
    if (chosen !== L) { await q('UPDATE members SET language=$2 WHERE id=$1', [m.id, chosen]); L = chosen; }
    parts = parts.slice(1);
    if (parts.length === 0) return CON(t(L, 'welcome'));
    if (!/^\d{4}$/.test(parts[0])) return END(t(L, 'pin4'));
    if (parts.length === 1) return CON(t(L, 'confirm'));
    if (parts[1] !== parts[0]) return END(t(L, 'mismatch'));
    await q('UPDATE members SET pin_hash=$2, pin_failures=0 WHERE id=$1', [m.id, await bcrypt.hash(parts[0], 10)]);
    return END(t(L, 'saved'));
  }

  if (parts.length === 0) return CON(t(L, 'enterPin'));
  if (!(await bcrypt.compare(parts[0], m.pin_hash))) {
    const n = (await q('UPDATE members SET pin_failures=pin_failures+1 WHERE id=$1 RETURNING pin_failures', [m.id])).rows[0].pin_failures;
    return END(n >= 3 ? t(L, 'wrongLocked') : t(L, 'wrong', { n: 3 - n }));
  }
  if (m.pin_failures) await q('UPDATE members SET pin_failures=0 WHERE id=$1', [m.id]);
  if (parts.length === 1) return CON(t(L, 'menu'));

  // Option 6: change language (works without an open cycle)
  if (parts[1] === '6') {
    if (parts.length === 2) return CON(languageMenu());
    const chosen = langFromChoice(parts[2]);
    if (!chosen) return END(t(L, 'invalid'));
    await q('UPDATE members SET language=$2 WHERE id=$1', [m.id, chosen]);
    return END(t(chosen, 'langSet'));
  }

  const cycle = (await q("SELECT * FROM cycles WHERE group_id=$1 AND status='open'", [m.group_id])).rows[0];
  if (!cycle && parts[1] !== '5') return END(t(L, 'noCycle'));
  const last = cycle && (await q('SELECT created_at FROM postings WHERE member_id=$1 AND cycle_id=$2 ORDER BY id DESC LIMIT 1', [m.id, cycle.id])).rows[0];
  const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);

  switch (parts[1]) {
    case '1': {
      const sav = (await q("SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE member_id=$1 AND cycle_id=$2 AND type='contribution'", [m.id, cycle.id])).rows[0].s;
      return END(t(L, 'savings', { amt: kwacha(sav), last: last ? t(L, 'lastEntry', { date: fmtDate(last.created_at) }) : t(L, 'noEntriesYet') }));
    }
    case '2': {
      const items = (await q(
        `SELECT s.due_date, s.principal_due + s.interest_due - s.paid_amount AS owed FROM schedule_items s JOIN loans l ON l.id=s.loan_id
         WHERE l.member_id=$1 AND l.cycle_id=$2 AND l.status='active' AND s.paid_amount < s.principal_due + s.interest_due ORDER BY s.due_date`, [m.id, cycle.id])).rows;
      if (!items.length) return END(t(L, 'noLoan'));
      const total = items.reduce((a, b) => a + b.owed, 0);
      return END(t(L, 'loan', { total: kwacha(total), next: kwacha(items[0].owed), due: items[0].due_date }));
    }
    case '3': {
      const x = (await q(
        `SELECT COALESCE(SUM(amount),0) AS pool,
           COALESCE(SUM(amount) FILTER (WHERE type='contribution'),0) AS total_sav,
           COALESCE(SUM(amount) FILTER (WHERE type='contribution' AND member_id=$2),0) AS mine
         FROM postings WHERE cycle_id=$1`, [cycle.id, m.id])).rows[0];
      const est = x.total_sav ? Math.floor((x.pool * x.mine) / x.total_sav) : 0;
      return END(t(L, 'projected', { est: kwacha(est), end: cycle.end_date }));
    }
    case '4': {
      const p = (await q('SELECT id FROM postings WHERE member_id=$1 AND cycle_id=$2 ORDER BY id DESC LIMIT 1', [m.id, cycle.id])).rows[0];
      if (!p) return END(t(L, 'noEntries'));
      const open = await q("SELECT 1 FROM disputes WHERE posting_id=$1 AND member_id=$2 AND status='open'", [p.id, m.id]);
      if (!open.rowCount) await q('INSERT INTO disputes (posting_id, member_id) VALUES ($1,$2)', [p.id, m.id]);
      return END(t(L, 'flagged', { id: p.id }));
    }
    case '5':
      return END(t(L, 'help'));
    default:
      return END(t(L, 'invalid'));
  }
}

// Africa's Talking posts form-encoded: sessionId, serviceCode, phoneNumber, text
r.post('/', async (req, res) => {
  if (!safeEq(req.query.secret || '', config.gatewaySecret)) return res.status(403).type('text/plain').send('END Forbidden');
  try {
    res.type('text/plain').send(await handle(req.body));
  } catch (e) {
    console.error('ussd', e);
    res.type('text/plain').send(`END ${t('en', 'unavailable')}`);
  }
});

export default r;
