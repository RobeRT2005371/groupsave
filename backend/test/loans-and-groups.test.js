import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, allocateRepayment, shareOut, loanLimit, needsSecondApproval, paymentStreak, addPeriod } from '../src/rules.js';
import { t } from '../src/i18n.js';

const DAY = 86400000;
const total = (items) => items.reduce((a, i) => a + i.principalDue + i.interestDue, 0);

test('loan schedules always repay exactly principal + interest, for any split', () => {
  for (const basis of ['flat', 'reducing']) {
    for (const principal of [100, 999, 12345, 100000, 7]) {
      for (const n of [1, 2, 3, 7, 12]) {
        if (principal < n) continue;
        const items = buildSchedule({ principal, rateBps: 1000, basis, instalments: n, startDate: '2026-01-01', frequency: 'weekly' });
        assert.equal(items.length, n);
        assert.equal(items.reduce((a, i) => a + i.principalDue, 0), principal, `${basis} ${principal}/${n} principal`);
        assert.ok(items.every((i) => i.principalDue >= 0 && i.interestDue >= 0));
      }
    }
  }
});

test('flat interest equals rate x instalments x principal', () => {
  const items = buildSchedule({ principal: 100000, rateBps: 1000, basis: 'flat', instalments: 4, startDate: '2026-01-01', frequency: 'weekly' });
  assert.equal(total(items), 140000); // 10% per period, 4 periods
});

test('repayment is applied oldest-first and never over-allocates', () => {
  const items = [{ id: 1, principal_due: 500, interest_due: 100, paid_amount: 0 }, { id: 2, principal_due: 500, interest_due: 100, paid_amount: 0 }];
  let r = allocateRepayment(items, 450);
  assert.deepEqual(r.changes, [{ id: 1, paid: 450 }]);
  assert.equal(r.leftover, 0);
  r = allocateRepayment(items, 900);
  assert.deepEqual(r.changes, [{ id: 1, paid: 600 }, { id: 2, paid: 300 }]);
  r = allocateRepayment(items, 1300);
  assert.equal(r.leftover, 100); // more than owed is reported, not silently swallowed
  assert.equal(r.changes.reduce((a, c) => a + c.paid, 0), 1200);
});

test('a part-paid instalment only asks for what is left', () => {
  const items = [{ id: 1, principal_due: 500, interest_due: 100, paid_amount: 550 }, { id: 2, principal_due: 500, interest_due: 100, paid_amount: 0 }];
  const r = allocateRepayment(items, 100);
  assert.deepEqual(r.changes, [{ id: 1, paid: 50 }, { id: 2, paid: 50 }]);
});

test('share-out always pays out exactly the pool', () => {
  for (const pool of [0, 1, 99, 100000, 123457]) {
    for (const weights of [[1, 1, 1], [5, 3, 2], [7], [0, 4, 0, 9], [1, 1, 1, 1, 1, 1, 1]]) {
      const out = shareOut(pool, weights);
      assert.equal(out.reduce((a, b) => a + b, 0), pool, `pool ${pool} weights ${weights}`);
      assert.ok(out.every((x) => Number.isInteger(x) && x >= 0));
    }
  }
  assert.throws(() => shareOut(-1, [1, 2]));
});

test('loan limit is a multiple of savings', () => {
  assert.equal(loanLimit(5000, 3), 15000);
  assert.equal(loanLimit(0, 3), 0);
});

test('two-officer approval applies only above the threshold', () => {
  assert.equal(needsSecondApproval(1000, null), false);
  assert.equal(needsSecondApproval(1000, 0), false);
  assert.equal(needsSecondApproval(1000, 1000), false); // at the threshold is still a single approval
  assert.equal(needsSecondApproval(1001, 1000), true);
  assert.equal(needsSecondApproval(5, '1'), true); // bigint columns arrive as strings
});

test('payment streaks count consecutive periods, with a grace period for the current one', () => {
  const now = Date.UTC(2026, 10, 14, 12);
  const ago = (d) => new Date(now - d * DAY);
  assert.deepEqual(paymentStreak([], 7, now), { streak: 0, paidThisPeriod: false });
  assert.deepEqual(paymentStreak([ago(1), ago(8), ago(15)], 7, now), { streak: 3, paidThisPeriod: true });
  // nothing yet this week, but last week and the week before were paid: streak is kept
  assert.deepEqual(paymentStreak([ago(9), ago(16)], 7, now), { streak: 2, paidThisPeriod: false });
  // a missed week breaks it
  assert.deepEqual(paymentStreak([ago(1), ago(15)], 7, now), { streak: 1, paidThisPeriod: true });
  // future-dated entries are ignored
  assert.deepEqual(paymentStreak([new Date(now + DAY)], 7, now), { streak: 0, paidThisPeriod: false });
});

test('instalment dates step by the cycle frequency', () => {
  assert.equal(addPeriod('2026-01-01', 'weekly', 2), '2026-01-15');
  assert.equal(addPeriod('2026-01-01', 'fortnightly', 1), '2026-01-15');
  assert.equal(addPeriod('2026-01-31', 'monthly', 1).slice(0, 7), '2026-03'); // JS rolls 31 Jan + 1 month into March
});

test('guarantor SMS keeps its placeholders in every translated language', () => {
  for (const lang of ['en', 'bem', 'nya', 'toi', 'loz']) {
    const s = t(lang, 'guarantorAsk', { name: 'NAME', amt: 'AMT' });
    assert.ok(s.includes('NAME') && s.includes('AMT'), lang);
  }
});
