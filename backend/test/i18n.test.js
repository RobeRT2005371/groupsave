import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, t, smsBody, languageMenu, langFromChoice } from '../src/i18n.js';

const KEYS = ['welcome', 'pin4', 'confirm', 'mismatch', 'saved', 'enterPin', 'wrong', 'wrongLocked', 'locked', 'notReg', 'menu', 'noCycle', 'savings',
  'lastEntry', 'noEntriesYet', 'noLoan', 'loan', 'projected', 'flagged', 'noEntries', 'help', 'invalid', 'langSet', 'unavailable', 'otp', 'remindLoan', 'remindMeeting', 'remindOnline', 'loanApproved', 'loanRejected',
  'totalWord', 'rev', 'contribution', 'fine', 'loan_disbursement', 'loan_repayment', 'payout'];
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('every language is fully translated with matching placeholders', () => {
  for (const { code } of LANGUAGES) {
    for (const k of KEYS) {
      const en = t('en', k, {});
      const raw = t(code, k, { n: '{n}', amt: '{amt}', last: '{last}', total: '{total}', next: '{next}', due: '{due}', est: '{est}', end: '{end}', id: '{id}', date: '{date}' });
      assert.ok(raw, `${code}.${k} missing`);
      if (code !== 'en') assert.equal(vars(raw), vars(t('en', k, { n: '{n}', amt: '{amt}', last: '{last}', total: '{total}', next: '{next}', due: '{due}', est: '{est}', end: '{end}', id: '{id}', date: '{date}' })), `${code}.${k} placeholders differ`);
      void en;
    }
  }
});

test('USSD screens fit within the 182-character limit', () => {
  for (const { code } of LANGUAGES) {
    for (const k of ['welcome', 'menu', 'help', 'locked', 'flagged', 'loan', 'projected']) {
      assert.ok(t(code, k, { id: 123456, total: 'K10,000.00', next: 'K1,000.00', due: '2026-11-20', est: 'K10,000.00', end: '2027-05-12' }).length <= 182, `${code}.${k} too long`);
    }
  }
  assert.ok(languageMenu().length <= 182);
});

test('language menu choice and SMS body', () => {
  assert.equal(langFromChoice('2'), 'bem');
  assert.equal(langFromChoice('9'), undefined);
  const b = smsBody('nya', { type: 'contribution', reversal: false, amountText: 'K200.00', totalText: 'K2,400.00', date: '14/11', id: 10483, code: '7F2A' });
  assert.match(b, /K200.00 kusunga 14\/11\. Zonse K2,400.00\. Ref 10483 Code 7F2A\./);
});

import { gsmSafe, smsParts } from '../src/sms.js';
import { meetingReminderBody } from '../src/reminders.js';
test('local-language letters are spelled in plain letters so SMS stays cheap', () => {
  assert.equal(gsmSafe('Ha ku na se si ñolilwe, koloto e šetile'), 'Ha ku na se si ngolilwe, koloto e shetile');
  assert.equal(smsParts('GroupSave: K200.00 ku boloka 13/11. Kaufela K650.00. Ref 23 Code 0C54.'), 1);
  assert.equal(smsParts('x'.repeat(161)), 2);
  assert.ok(smsParts('é'.repeat(10) + '’') >= 1);
});
test('every language can build a meeting reminder', () => {
  for (const { code } of LANGUAGES) {
    const b = meetingReminderBody(code, { date: '2026-11-20', time: '14:30', online: true });
    assert.match(b, /20\/11 14:30/);
    assert.ok(b.length <= 160, code + ' reminder too long: ' + b.length);
  }
});
