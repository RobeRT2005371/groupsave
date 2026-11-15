import { config } from './config.js';
import { q } from './db.js';
import { decrypt } from './security.js';

/**
 * Local-language letters such as ñ and š are not in the basic SMS alphabet. One such letter makes the
 * whole message "Unicode", which fits only 70 characters per part instead of 160, roughly doubling or
 * tripling the cost. We spell them with plain letters so messages stay cheap.
 */
const PLAIN = { 'ñ': 'ng', 'Ñ': 'Ng', 'š': 'sh', 'Š': 'Sh', 'ŋ': 'ng', 'Ŋ': 'Ng', 'ŵ': 'w', 'ŝ': 's' };
export const gsmSafe = (s) => s.replace(/[ñÑšŠŋŊŵŝ]/g, (c) => PLAIN[c]);

/** Number of SMS parts (what the operator bills) for a message. */
export function smsParts(body) {
  const text = gsmSafe(body);
  const unicode = /[^\u0000-\u007f£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¤¡ÄÖÑÜ§¿äöñüà€]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

export async function sendSms(phone, message) {
  const text = gsmSafe(message);
  if (!config.atApiKey) {
    console.log(`[sms:console] ${phone}: ${text}`);
    return;
  }
  const host = config.atUsername === 'sandbox' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
  const form = new URLSearchParams({ username: config.atUsername, to: phone, message: text });
  if (config.atSenderId) form.set('from', config.atSenderId);
  const res = await fetch(`https://${host}/version1/messaging`, {
    method: 'POST',
    headers: { apiKey: config.atApiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) throw new Error(`SMS gateway ${res.status}`);
}

/** Retry up to 3 attempts, 5 minutes apart (about 15 minutes in total). */
export async function processNotifications() {
  const { rows } = await q(
    `SELECT n.id, n.body, n.attempts, m.phone_enc FROM notifications n JOIN members m ON m.id = n.member_id
     WHERE n.status='pending' AND n.next_attempt_at <= now() ORDER BY n.id LIMIT 100`,
  );
  for (const n of rows) {
    try {
      await sendSms(decrypt(n.phone_enc), n.body);
      await q("UPDATE notifications SET status='sent', attempts=attempts+1 WHERE id=$1", [n.id]);
    } catch (e) {
      const failed = n.attempts + 1 >= 3;
      await q(
        "UPDATE notifications SET attempts=attempts+1, status=$2, next_attempt_at=now()+interval '5 minutes' WHERE id=$1",
        [n.id, failed ? 'failed' : 'pending'],
      );
    }
  }
}

export function startSmsWorker() {
  // Every 5 seconds, up to 100 messages (about 1,200 a minute) so many groups do not queue up behind each other.
  setInterval(() => processNotifications().catch((e) => console.error('sms worker', e.message)), 5000);
  // purge old logs after 90 days
  setInterval(() => q("DELETE FROM notifications WHERE created_at < now() - interval '90 days'").catch(() => {}), 24 * 3600 * 1000);
}
