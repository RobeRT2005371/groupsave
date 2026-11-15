import { Router } from 'express';
import { q } from '../db.js';
import { wrap, httpError } from '../middleware.js';
import { kwacha } from '../rules.js';

const r = Router();
const ddmm = (iso) => `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}`;
const ORDER = { alert: 0, warn: 1, info: 2 };

/**
 * Things an officer should act on, worked out from live data (so they are always accurate).
 * Each item has an English template plus values; the app translates the template.
 * An officer can dismiss an item; it comes back only if the situation changes (its key changes).
 */
async function buildAlerts(user) {
  const g = user.groupId;
  const role = user.role;
  const items = [];
  const add = (key, severity, template, vars, link, at) => items.push({ key, severity, template, vars, link, at: at || new Date().toISOString() });

  // Member queries waiting for the chairperson
  for (const d of (await q(
    `SELECT d.id, d.posting_id, d.raised_at, m.full_name FROM disputes d JOIN members m ON m.id=d.member_id
     JOIN postings p ON p.id=d.posting_id JOIN cycles c ON c.id=p.cycle_id
     WHERE c.group_id=$1 AND d.status='open' ORDER BY d.id DESC LIMIT 20`, [g])).rows) {
    add(`dispute:${d.id}`, 'warn', '{name} queried entry #{id}', { name: d.full_name, id: d.posting_id }, '/disputes', d.raised_at);
  }

  const failed = (await q("SELECT COUNT(*) AS n FROM notifications n JOIN members m ON m.id=n.member_id WHERE m.group_id=$1 AND n.status='failed'", [g])).rows[0].n;
  if (failed > 0) add(`failed-sms:${failed}`, 'alert', '{n} SMS messages failed to send', { n: failed }, '/outbox');

  for (const l of (await q(
    `SELECT l.id, m.full_name, SUM(s.principal_due + s.interest_due - s.paid_amount) AS owed
     FROM loans l JOIN cycles c ON c.id=l.cycle_id JOIN members m ON m.id=l.member_id JOIN schedule_items s ON s.loan_id=l.id
     WHERE c.group_id=$1 AND l.status='active' AND s.due_date < CURRENT_DATE AND s.paid_amount < s.principal_due + s.interest_due
     GROUP BY l.id, m.full_name`, [g])).rows) {
    add(`overdue:${l.id}:${l.owed}`, 'alert', "{name}'s loan is overdue ({amount})", { name: l.full_name, amount: kwacha(l.owed) }, '/loans');
  }

  for (const s of (await q(
    `SELECT s.id, m.full_name, s.due_date, s.principal_due + s.interest_due - s.paid_amount AS owed
     FROM schedule_items s JOIN loans l ON l.id=s.loan_id JOIN cycles c ON c.id=l.cycle_id JOIN members m ON m.id=l.member_id
     WHERE c.group_id=$1 AND l.status='active' AND s.paid_amount < s.principal_due + s.interest_due
       AND s.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3 ORDER BY s.due_date LIMIT 20`, [g])).rows) {
    add(`due:${s.id}`, 'info', '{name} owes {amount} due {date}', { name: s.full_name, amount: kwacha(s.owed), date: ddmm(s.due_date) }, '/loans');
  }

  for (const m of (await q(
    `SELECT mt.id, mt.date, mt.start_time FROM meetings mt JOIN cycles c ON c.id=mt.cycle_id
     WHERE c.group_id=$1 AND mt.date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 ORDER BY mt.date, mt.start_time`, [g])).rows) {
    add(`meeting:${m.id}`, 'info', 'Upcoming meeting: {date}{time}', { date: ddmm(m.date), time: m.start_time ? ' ' + m.start_time : '' }, '/meetings');
  }

  if (['chairperson', 'treasurer'].includes(role)) {
    for (const lr of (await q("SELECT lr.id, lr.amount, lr.created_at, m.full_name FROM loan_requests lr JOIN members m ON m.id=lr.member_id WHERE m.group_id=$1 AND lr.status='pending' ORDER BY lr.id DESC LIMIT 20", [g])).rows) {
      add(`loanreq:${lr.id}`, 'warn', '{name} requested a loan of {amount}', { name: lr.full_name, amount: kwacha(lr.amount) }, '/loans', lr.created_at);
    }
    const c = (await q("SELECT id, end_date FROM cycles WHERE group_id=$1 AND status='open' AND end_date <= CURRENT_DATE + 14", [g])).rows[0];
    if (c) add(`cycle-end:${c.id}`, 'warn', 'Cycle ends on {date}. Settle all loans and prepare the share-out.', { date: ddmm(c.end_date) }, '/shareout');
    const un = (await q('SELECT COUNT(*) AS n FROM payment_receipts WHERE group_id=$1 AND matched_posting_id IS NULL', [g])).rows[0].n;
    if (un > 0) add(`receipts:${un}`, 'warn', '{n} mobile money payments are not yet matched', { n: un }, '/receipts');
  }

  if (['chairperson', 'secretary'].includes(role)) {
    for (const r of (await q(
      `SELECT r.id, r.created_at, a.full_name
       FROM group_join_requests r JOIN group_applicants a ON a.id=r.applicant_id
       WHERE r.group_id=$1 AND r.status='pending' ORDER BY r.id DESC LIMIT 20`,
      [g],
    )).rows) {
      add(`joinreq:${r.id}`, 'warn', '{name} requested to join the group', { name: r.full_name }, '/members', r.created_at);
    }
    for (const m of (await q("SELECT id, full_name FROM members WHERE group_id=$1 AND status='active' AND pin_failures >= 3", [g])).rows) {
      add(`locked:${m.id}`, 'warn', "{name}'s PIN is locked", { name: m.full_name }, '/members');
    }
  }

  const me = (await q('SELECT totp_enabled FROM members WHERE id=$1', [user.id])).rows[0];
  if (me && !me.totp_enabled) add('2fa', 'info', 'Turn on two-factor sign-in to protect your account', {}, '/settings');

  const dismissed = new Set((await q('SELECT key FROM alert_dismissals WHERE member_id=$1', [user.id])).rows.map((x) => x.key));
  return items.filter((i) => !dismissed.has(i.key)).sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || new Date(b.at) - new Date(a.at));
}

r.get('/', wrap(async (req, res) => {
  const items = await buildAlerts(req.user);
  res.json({ items, count: items.length });
}));

r.post('/dismiss', wrap(async (req, res) => {
  const keys = (Array.isArray(req.body.keys) ? req.body.keys : [req.body.key]).filter((k) => typeof k === 'string' && k.length < 100);
  if (!keys.length) throw httpError(400, 'Nothing to dismiss');
  for (const k of keys) await q('INSERT INTO alert_dismissals (member_id, key) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, k]);
  res.json({ ok: true });
}));

export default r;
