// Data-retention job: removes short-lived personal data and anonymizes long-gone members.
//
// What is NEVER touched: the ledger (postings), loans, schedules, cycles and the audit log. They are the group's
// financial record and are protected by the hash chain. Anonymized members stay in the ledger as "Former member".
//
// Run automatically once a day from server.js, or by hand:
//   node src/retention.js --dry-run     (report what would be removed, change nothing)
//   node src/retention.js               (apply)
import { pathToFileURL } from 'node:url';
import { pool, tx, q } from './db.js';

const days = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
};

export const retentionPolicy = () => ({
  notificationDays: days('RETENTION_NOTIFICATIONS_DAYS', 90),    // queued/sent SMS text and its phone-linked log
  otpDays: days('RETENTION_OTP_DAYS', 1),                        // expired sign-in codes
  idempotencyDays: days('RETENTION_IDEMPOTENCY_DAYS', 30),       // offline-retry keys
  errorLogDays: days('RETENTION_ERROR_LOG_DAYS', 90),
  joinRequestDays: days('RETENTION_JOIN_REQUEST_DAYS', 90),      // decided or stale join requests and their applicants' phone numbers
  messageDays: days('RETENTION_MESSAGES_DAYS', 365),             // chat and direct messages
  exitedMemberDays: days('RETENTION_EXITED_MEMBER_DAYS', 365),   // exited members are anonymized after this long
});

const count = async (c, sql, params = []) => (await c.query(sql, params)).rowCount;

/** Apply every retention rule in one transaction. With dryRun the transaction is rolled back, so the counts are real but nothing changes. */
export async function runRetention({ dryRun = false } = {}) {
  const p = retentionPolicy();
  class DryRunDone extends Error {}
  let result;
  try {
    await tx(async (c) => {
      const r = {};
      r.notifications = await count(c, `DELETE FROM notifications WHERE created_at < now() - make_interval(days => $1)`, [p.notificationDays]);
      r.otps = await count(c, `DELETE FROM member_otps WHERE expires_at < now() - make_interval(days => $1)`, [p.otpDays]);
      r.idempotencyKeys = await count(c, `DELETE FROM idempotency_keys WHERE created_at < now() - make_interval(days => $1)`, [p.idempotencyDays]);
      r.errorLog = await count(c, `DELETE FROM error_log WHERE created_at < now() - make_interval(days => $1)`, [p.errorLogDays]);

      r.joinRequests = await count(c,
        `DELETE FROM group_join_requests
         WHERE COALESCE(decided_at, created_at) < now() - make_interval(days => $1)`, [p.joinRequestDays]);
      r.applicants = await count(c,
        `DELETE FROM group_applicants a
         WHERE a.created_at < now() - make_interval(days => $1)
           AND NOT EXISTS (SELECT 1 FROM group_join_requests r WHERE r.applicant_id = a.id)`, [p.joinRequestDays]);

      r.messages =
        await count(c, `DELETE FROM chat_messages WHERE created_at < now() - make_interval(days => $1)`, [p.messageDays]) +
        await count(c, `DELETE FROM direct_messages WHERE created_at < now() - make_interval(days => $1)`, [p.messageDays]) +
        await count(c, `DELETE FROM group_chat WHERE created_at < now() - make_interval(days => $1)`, [p.messageDays]);

      // Anonymize members who left long ago, but only when nothing active still depends on them:
      // no loan still being repaid and no entries in a cycle that is still open.
      const due = (await c.query(
        `SELECT m.id FROM members m
         WHERE m.status = 'exited' AND m.anonymized_at IS NULL
           AND m.exited_at < now() - make_interval(days => $1)
           AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.member_id = m.id AND l.status = 'active')
           AND NOT EXISTS (SELECT 1 FROM postings po JOIN cycles cy ON cy.id = po.cycle_id WHERE po.member_id = m.id AND cy.status = 'open')
         FOR UPDATE OF m`, [p.exitedMemberDays])).rows;
      for (const { id } of due) {
        await c.query('DELETE FROM notifications WHERE member_id=$1', [id]);
        await c.query('DELETE FROM member_otps WHERE member_id=$1', [id]);
        await c.query('DELETE FROM alert_dismissals WHERE member_id=$1', [id]);
        await c.query('DELETE FROM idempotency_keys WHERE actor_id=$1', [id]);
        await c.query('DELETE FROM member_goals WHERE member_id=$1', [id]);
        await c.query('DELETE FROM chat_messages WHERE member_id=$1 OR sender_id=$1', [id]);
        await c.query('DELETE FROM direct_messages WHERE sender_id=$1 OR recipient_id=$1', [id]);
        await c.query('DELETE FROM group_chat WHERE sender_id=$1', [id]);
        await c.query(
          `UPDATE members SET full_name = 'Former member #' || id, phone_enc = '', phone_hash = 'anonymized:' || id,
             password_hash = NULL, pin_hash = NULL, portal_password_hash = NULL, totp_secret = NULL, totp_enabled = false,
             pin_setup_until = NULL, anonymized_at = now() WHERE id = $1`, [id]);
        await c.query(
          `INSERT INTO audit_log (group_id, actor, action, entity) SELECT group_id, NULL, 'member.anonymize', 'member:' || id FROM members WHERE id=$1`, [id]);
      }
      r.membersAnonymized = due.length;

      result = r;
      if (dryRun) throw new DryRunDone();
    });
  } catch (e) {
    if (!(e instanceof DryRunDone)) throw e;
  }
  await q('INSERT INTO retention_runs (dry_run, result) VALUES ($1,$2)', [dryRun, JSON.stringify({ ...result, policy: p })]).catch(() => {});
  return result;
}

export function startRetentionJob() {
  if (process.env.RETENTION_ENABLED === 'false') return;
  const tick = () => runRetention()
    .then((r) => { const n = Object.values(r).reduce((a, b) => a + b, 0); if (n) console.log('[retention]', JSON.stringify(r)); })
    .catch((e) => console.error('retention', e.message));
  setTimeout(tick, 60 * 1000);
  setInterval(tick, 24 * 3600 * 1000);
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dryRun = process.argv.includes('--dry-run');
  runRetention({ dryRun })
    .then((r) => { console.log(dryRun ? 'Dry run (nothing changed):' : 'Retention applied:', r); return pool.end(); })
    .catch((e) => { console.error(e); process.exit(1); });
}
