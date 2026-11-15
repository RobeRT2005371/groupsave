import { q } from './db.js';
import { t } from './i18n.js';
import { kwacha } from './rules.js';
import { config } from './config.js';

const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Remind members the day before (and on the day) a loan instalment is due.
 * Each instalment is reminded once; runs on start and every 6 hours.
 */
export async function runLoanReminders() {
  const { rows } = await q(
    `SELECT s.id, s.due_date, s.principal_due + s.interest_due - s.paid_amount AS owed, m.id AS member_id, m.language
     FROM schedule_items s JOIN loans l ON l.id=s.loan_id JOIN cycles c ON c.id=l.cycle_id JOIN members m ON m.id=l.member_id
     WHERE l.status='active' AND c.status='open' AND m.status='active' AND NOT s.reminded
       AND s.paid_amount < s.principal_due + s.interest_due
       AND s.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 1`);
  let sent = 0;
  for (const r of rows) {
    const claimed = await q('UPDATE schedule_items SET reminded=true WHERE id=$1 AND NOT reminded RETURNING id', [r.id]);
    if (!claimed.rowCount) continue;
    await q('INSERT INTO notifications (member_id, body) VALUES ($1,$2)', [r.member_id, t(r.language, 'remindLoan', { amt: kwacha(r.owed), date: ddmm(r.due_date) }) + ` ${config.appUrl}/?go=pay`]);
    sent++;
  }
  return sent;
}

/** For online meetings the SMS ends with a tap-to-join link (phones make it clickable). It needs a sign-in, so only members get in. */
export const meetingJoinLink = (id) => `${config.appUrl}/?join=${id}`;

export const meetingReminderBody = (lang, { id, date, time, online }) =>
  t(lang, 'remindMeeting', { date: ddmm(date), time: time ? ' ' + time : '' }) + (online ? t(lang, 'remindOnline') + (id ? ' ' + meetingJoinLink(id) : '') : '');

export function startReminderJob() {
  const tick = () => runLoanReminders().then((n) => n && console.log(`[reminders] ${n} loan reminders queued`)).catch((e) => console.error('reminders', e.message));
  setTimeout(tick, 5000);
  setInterval(tick, 6 * 3600 * 1000);
}
