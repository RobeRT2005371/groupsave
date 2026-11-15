import { sha256 } from './security.js';
import { kwacha } from './rules.js';
import { smsBody } from './i18n.js';

export const GENESIS = '0'.repeat(64);

export function computeHash(prevHash, p) {
  return sha256(
    prevHash +
      JSON.stringify([p.id, p.cycle_id, p.member_id, p.type, p.amount, p.recorded_by, p.reverses_id ?? null, p.created_at]),
  );
}

export async function audit(client, { groupId, actor, action, entity, before = null, after = null }) {
  await client.query(
    'INSERT INTO audit_log (group_id, actor, action, entity, before, after) VALUES ($1,$2,$3,$4,$5,$6)',
    [groupId, actor, action, entity, before, after],
  );
}

/**
 * Append one posting to a cycle's hash chain. Must be called inside a transaction;
 * the cycle row is locked so the chain cannot fork.
 */
export async function addPosting(client, { cycleId, memberId, meetingId = null, type, amount, reversesId = null, note = null, actorId, groupId }) {
  const cyc = await client.query('SELECT status FROM cycles WHERE id=$1 FOR UPDATE', [cycleId]);
  if (!cyc.rows[0]) throw Object.assign(new Error('Cycle not found'), { status: 404 });
  const last = await client.query('SELECT hash FROM postings WHERE cycle_id=$1 ORDER BY id DESC LIMIT 1', [cycleId]);
  const prevHash = last.rows[0]?.hash ?? GENESIS;
  const id = (await client.query("SELECT nextval(pg_get_serial_sequence('postings','id')) AS id")).rows[0].id;
  const createdAt = new Date().toISOString();
  const sav = await client.query(
    "SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE member_id=$1 AND cycle_id=$2 AND type='contribution'",
    [memberId, cycleId],
  );
  const running = sav.rows[0].s + (type === 'contribution' ? amount : 0);
  const row = { id: Number(id), cycle_id: cycleId, member_id: memberId, type, amount, recorded_by: actorId, reverses_id: reversesId, created_at: createdAt };
  const hash = computeHash(prevHash, row);
  await client.query(
    `INSERT INTO postings (id,cycle_id,member_id,meeting_id,type,amount,reverses_id,note,recorded_by,created_at,running_balance,prev_hash,hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, cycleId, memberId, meetingId, type, amount, reversesId, note, actorId, createdAt, running, prevHash, hash],
  );
  // Discreet SMS: amounts and references only, no names or notes. Sent in the member's chosen language.
  const lang = (await client.query('SELECT language FROM members WHERE id=$1', [memberId])).rows[0]?.language || 'en';
  const d = new Date(createdAt);
  const day = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const body = smsBody(lang, { type, reversal: !!reversesId, amountText: kwacha(Math.abs(amount)), totalText: kwacha(running), date: day, id, code: hash.slice(0, 4).toUpperCase() });
  await client.query('INSERT INTO notifications (member_id, body) VALUES ($1,$2)', [memberId, body]);
  await audit(client, { groupId, actor: actorId, action: reversesId ? 'posting.reverse' : 'posting.create', entity: `posting:${id}`, after: { type, amount, memberId, cycleId } });
  return { id: Number(id), hash, prev_hash: prevHash, running_balance: running, created_at: createdAt };
}

export async function verifyChain(client, cycleId) {
  const { rows } = await client.query('SELECT * FROM postings WHERE cycle_id=$1 ORDER BY id', [cycleId]);
  let prev = GENESIS;
  for (const r of rows) {
    const row = { ...r, created_at: new Date(r.created_at).toISOString() };
    if (r.prev_hash !== prev || computeHash(prev, row) !== r.hash) return { ok: false, brokenAt: Number(r.id), count: rows.length };
    prev = r.hash;
  }
  return { ok: true, count: rows.length, head: prev.slice(0, 4).toUpperCase() };
}
