// Pure rules engine. All money is integer ngwee (1 kwacha = 100 ngwee).

export const DEFAULT_RULES = {
  contribution_amount: 5000, // ngwee
  frequency: 'weekly', // weekly | fortnightly | monthly
  interest_bps: 1000, // per period, basis points (1000 = 10%)
  interest_basis: 'flat', // flat | reducing
  loan_limit_multiple: 3, // x member savings
  fine_late: 1000,
  fine_absence: 2000,
  shareout_basis: 'savings', // savings | shares
  share_price: 5000,
};

export function validateRules(input = {}) {
  const r = { ...DEFAULT_RULES, ...input };
  const int = (k, min = 0) => {
    if (!Number.isInteger(r[k]) || r[k] < min) throw new Error(`${k} must be an integer >= ${min}`);
  };
  int('contribution_amount', 1);
  int('interest_bps');
  int('loan_limit_multiple', 1);
  int('fine_late');
  int('fine_absence');
  int('share_price', 1);
  if (r.interest_bps > 10000) throw new Error('interest_bps too high');
  if (!['weekly', 'fortnightly', 'monthly'].includes(r.frequency)) throw new Error('bad frequency');
  if (!['flat', 'reducing'].includes(r.interest_basis)) throw new Error('bad interest_basis');
  if (!['savings', 'shares'].includes(r.shareout_basis)) throw new Error('bad shareout_basis');
  return r;
}

export function addPeriod(dateStr, frequency, n = 1) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (frequency === 'monthly') d.setUTCMonth(d.getUTCMonth() + n);
  else d.setUTCDate(d.getUTCDate() + n * (frequency === 'weekly' ? 7 : 14));
  return d.toISOString().slice(0, 10);
}

/** Interest uses round-half-up on ngwee; any remainder lands on the last instalment. */
export function buildSchedule({ principal, rateBps, basis, instalments, startDate, frequency }) {
  if (!Number.isInteger(principal) || principal <= 0) throw new Error('principal must be positive');
  if (!Number.isInteger(instalments) || instalments < 1) throw new Error('instalments must be >= 1');
  const baseP = Math.floor(principal / instalments);
  const items = [];
  let balance = principal;
  let flatTotal = Math.round((principal * rateBps * instalments) / 10000);
  const baseFlat = Math.floor(flatTotal / instalments);
  for (let i = 1; i <= instalments; i++) {
    const last = i === instalments;
    const principalDue = last ? balance : baseP;
    let interestDue;
    if (basis === 'flat') interestDue = last ? flatTotal - baseFlat * (instalments - 1) : baseFlat;
    else interestDue = Math.round((balance * rateBps) / 10000);
    items.push({ seq: i, dueDate: addPeriod(startDate, frequency, i), principalDue, interestDue });
    balance -= principalDue;
  }
  return items;
}

/** Apply a repayment to the earliest unpaid instalments. Mutates copies, returns changes. */
export function allocateRepayment(items, amount) {
  let left = amount;
  const changes = [];
  for (const it of items) {
    const owed = it.principal_due + it.interest_due - it.paid_amount;
    if (owed <= 0 || left <= 0) continue;
    const pay = Math.min(owed, left);
    changes.push({ id: it.id, paid: pay });
    left -= pay;
  }
  return { changes, leftover: left };
}

/** Largest-remainder split so payouts always sum exactly to the pool. */
export function shareOut(pool, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (pool < 0) throw new Error('pool is negative');
  if (total === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (pool * w) / total);
  const out = raw.map(Math.floor);
  let rem = pool - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rem > 0; k++, rem--) out[order[k % order.length].i]++;
  return out;
}

export function loanLimit(savings, multiple) {
  return savings * multiple;
}

export const kwacha = (ngwee) =>
  'K' + (ngwee / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** How many days make one contribution period for a cycle's frequency. */
export const periodDays = (frequency) => (frequency === 'monthly' ? 30 : frequency === 'fortnightly' ? 14 : 7);

/** A loan above the group's threshold needs two different officers to approve it. */
export const needsSecondApproval = (amount, threshold) => threshold != null && Number(threshold) > 0 && amount > Number(threshold);

/**
 * Payment streak: how many periods in a row (counting back from now) contain at least one payment.
 * The current period is a grace period: if nothing has been paid in it yet, counting starts from the previous one.
 */
export function paymentStreak(dates, days, now = Date.now()) {
  const ms = days * 86400000;
  const times = dates.map((d) => new Date(d).getTime()).filter((x) => x <= now);
  const paidIn = (k) => times.some((x) => x > now - (k + 1) * ms && x <= now - k * ms);
  const paidThisPeriod = paidIn(0);
  let streak = 0;
  for (let k = paidThisPeriod ? 0 : 1; k < 200 && paidIn(k); k++) streak++;
  return { streak, paidThisPeriod };
}
