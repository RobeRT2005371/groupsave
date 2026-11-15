import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, shareOut, allocateRepayment, validateRules, kwacha } from '../src/rules.js';
import { computeHash, GENESIS } from '../src/ledger.js';
import { parseReceipt } from '../src/routes/misc.js';
import { issueLoan } from '../src/routes/loans.js';
import { runIdempotently } from '../src/idempotency.js';
import jwt from 'jsonwebtoken';
import { authenticate, portalAuthenticate } from '../src/middleware.js';
import { config } from '../src/config.js';

test('flat schedule sums to principal plus interest', () => {
  const s = buildSchedule({ principal: 100000, rateBps: 1000, basis: 'flat', instalments: 3, startDate: '2026-01-01', frequency: 'monthly' });
  assert.equal(s.reduce((a, i) => a + i.principalDue, 0), 100000);
  assert.equal(s.reduce((a, i) => a + i.interestDue, 0), 30000);
  assert.equal(s[0].dueDate, '2026-02-01');
});

test('reducing schedule charges interest on outstanding balance', () => {
  const s = buildSchedule({ principal: 90000, rateBps: 1000, basis: 'reducing', instalments: 3, startDate: '2026-01-01', frequency: 'weekly' });
  assert.deepEqual(s.map((i) => i.interestDue), [9000, 6000, 3000]);
  assert.equal(s.reduce((a, i) => a + i.principalDue, 0), 90000);
});

test('rounding remainder lands on last instalment', () => {
  const s = buildSchedule({ principal: 100, rateBps: 1000, basis: 'flat', instalments: 3, startDate: '2026-01-01', frequency: 'weekly' });
  assert.equal(s.reduce((a, i) => a + i.principalDue, 0), 100);
  assert.equal(s.reduce((a, i) => a + i.interestDue, 0), 30);
});

test('share-out always sums to the pool (property)', () => {
  for (let n = 0; n < 500; n++) {
    const weights = Array.from({ length: 1 + (n % 30) }, () => Math.floor(Math.random() * 100000));
    const pool = Math.floor(Math.random() * 10_000_000);
    const out = shareOut(pool, weights);
    const total = weights.reduce((a, b) => a + b, 0);
    assert.equal(out.reduce((a, b) => a + b, 0), total === 0 ? 0 : pool);
    out.forEach((v, i) => assert.ok(v >= 0 && (weights[i] > 0 || v === 0)));
  }
});

test('repayment is applied to earliest instalments first', () => {
  const items = [
    { id: 1, principal_due: 100, interest_due: 10, paid_amount: 0 },
    { id: 2, principal_due: 100, interest_due: 10, paid_amount: 0 },
  ];
  const { changes, leftover } = allocateRepayment(items, 150);
  assert.deepEqual(changes, [{ id: 1, paid: 110 }, { id: 2, paid: 40 }]);
  assert.equal(leftover, 0);
  assert.equal(allocateRepayment(items, 500).leftover, 280);
});

test('loan approval cannot fall through to a newer open cycle', async () => {
  let calls = 0;
  const client = {
    async query(sql, params) {
      calls++;
      assert.match(sql, /group_id=\$1 AND status='open' AND \(\$2::int IS NULL OR id=\$2\)/);
      assert.deepEqual(params, [4, 17]);
      return { rows: [] };
    },
  };
  await assert.rejects(
    issueLoan(client, { groupId: 4, actorId: 2, memberId: 3, principal: 100, instalments: 1, cycleId: 17 }),
    { status: 400, message: 'No open cycle' },
  );
  assert.equal(calls, 1);
});

test('idempotency keys replay a completed write without repeating it', async () => {
  const rows = new Map();
  const client = {
    async query(sql, params) {
      if (sql.startsWith('INSERT INTO idempotency_keys')) {
        const key = params.slice(0, 3).join(':');
        if (rows.has(key)) return { rowCount: 0 };
        rows.set(key, { route: params[3], response: null });
        return { rowCount: 1 };
      }
      if (sql.startsWith('SELECT route, response')) {
        return { rows: [rows.get(params.slice(0, 3).join(':'))] };
      }
      if (sql.startsWith('UPDATE idempotency_keys')) {
        rows.get(params.slice(0, 3).join(':')).response = params[3];
        return { rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  let writes = 0;
  const options = { groupId: 1, actorId: 2, key: 'test-key', route: 'posting.contribution' };
  const action = async () => ({ id: ++writes });
  assert.deepEqual(await runIdempotently(client, { ...options, action }), { id: 1 });
  assert.deepEqual(await runIdempotently(client, { ...options, action }), { id: 1 });
  assert.equal(writes, 1);
  await assert.rejects(
    runIdempotently(client, { ...options, route: 'meeting.attendance', action }),
    { status: 409 },
  );
});

test('legacy applicant tokens remain isolated from officer and member APIs', () => {
  const token = jwt.sign({ id: 42, scope: 'applicant' }, config.jwtSecret);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let officerError;
  authenticate(req, {}, (error) => { officerError = error; });
  assert.equal(officerError.status, 403);

  let memberError;
  portalAuthenticate({ headers: { authorization: `Bearer ${token}` } }, {}, (error) => { memberError = error; });
  assert.equal(memberError.status, 403);
});

test('rules validation rejects bad input', () => {
  assert.throws(() => validateRules({ interest_bps: -1 }));
  assert.throws(() => validateRules({ frequency: 'daily' }));
  assert.equal(validateRules({}).frequency, 'weekly');
});

test('hash chain detects alteration', () => {
  const mk = (id, amount, prev) => {
    const p = { id, cycle_id: 1, member_id: 1, type: 'contribution', amount, recorded_by: 1, reverses_id: null, created_at: '2026-01-01T00:00:00.000Z' };
    return { ...p, prev_hash: prev, hash: computeHash(prev, p) };
  };
  const a = mk(1, 5000, GENESIS);
  const b = mk(2, 5000, a.hash);
  assert.equal(computeHash(a.hash, b), b.hash);
  assert.notEqual(computeHash(a.hash, { ...b, amount: 9000 }), b.hash);
});

test('receipt parsing and money formatting', () => {
  const r = parseReceipt('Confirmed. You have received K1,250.50 from 0971234567. Transaction ID: MP26ABC123XY');
  assert.equal(r.amount, 125050);
  assert.equal(r.reference, 'MP26ABC123XY');
  assert.equal(kwacha(240000), 'K2,400.00');
});

import { verifyTotp, newTotpSecret, totpNow } from '../src/security.js';
test('TOTP matches RFC 6238 test vector and rejects wrong codes', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.ok(verifyTotp(secret, '287082', 59000));
  assert.ok(!verifyTotp(secret, '000000', 59000));
  assert.ok(!verifyTotp(secret, 'abcdef', 59000));
  const s = newTotpSecret();
  assert.ok(verifyTotp(s, totpNow(s)));
});
