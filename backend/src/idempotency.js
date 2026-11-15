import { httpError } from './middleware.js';

export function idempotencyKey(req) {
  const key = req.get('Idempotency-Key');
  if (key && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    throw httpError(400, 'Invalid idempotency key');
  }
  return key || null;
}

export async function runIdempotently(client, { groupId, actorId, key, route, action }) {
  if (!key) return action();

  const inserted = await client.query(
    `INSERT INTO idempotency_keys (group_id, actor_id, key, route)
     VALUES ($1,$2,$3,$4) ON CONFLICT (group_id, actor_id, key) DO NOTHING`,
    [groupId, actorId, key, route],
  );
  if (!inserted.rowCount) {
    const saved = (await client.query(
      'SELECT route, response FROM idempotency_keys WHERE group_id=$1 AND actor_id=$2 AND key=$3 FOR UPDATE',
      [groupId, actorId, key],
    )).rows[0];
    if (saved.route !== route) throw httpError(409, 'Idempotency key was already used for a different action');
    if (saved.response == null) throw httpError(409, 'This request is still being processed');
    return saved.response;
  }

  const result = await action();
  await client.query(
    'UPDATE idempotency_keys SET response=$4 WHERE group_id=$1 AND actor_id=$2 AND key=$3',
    [groupId, actorId, key, result],
  );
  return result;
}
