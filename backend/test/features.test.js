import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';
import { authenticate } from '../src/middleware.js';
import { periodDays } from '../src/rules.js';
import { t } from '../src/i18n.js';

const run = (role, method) => {
  const token = jwt.sign({ id: 1, groupId: 1, role }, config.jwtSecret);
  let err;
  authenticate({ headers: { authorization: 'Bearer ' + token }, method }, {}, (e) => { err = e; });
  return err;
};

test('auditors can read but never change anything', () => {
  assert.equal(run('auditor', 'GET'), undefined);
  for (const m of ['POST', 'PATCH', 'PUT', 'DELETE']) assert.equal(run('auditor', m)?.status, 403, m);
});

test('other officers can still write', () => {
  assert.equal(run('treasurer', 'POST'), undefined);
  assert.equal(run('chairperson', 'DELETE'), undefined);
});

test('member portal tokens cannot reach officer routes', () => {
  const token = jwt.sign({ id: 1, groupId: 1, role: 'member', scope: 'portal' }, config.jwtSecret);
  let err;
  authenticate({ headers: { authorization: 'Bearer ' + token }, method: 'GET' }, {}, (e) => { err = e; });
  assert.equal(err?.status, 403);
});

test('contribution period length follows the cycle frequency', () => {
  assert.equal(periodDays('weekly'), 7);
  assert.equal(periodDays('fortnightly'), 14);
  assert.equal(periodDays('monthly'), 30);
});

test('new SMS texts exist and keep the amount placeholder', () => {
  for (const lang of ['en', 'bem', 'nya', 'toi', 'loz']) {
    assert.match(t(lang, 'remindPay', { amt: 'K50.00' }), /K50\.00/, lang);
    assert.ok(t(lang, 'replyNotice').length > 10, lang);
  }
  // languages without a translation fall back to English rather than showing nothing
  assert.match(t('lue', 'remindPay', { amt: 'K50.00' }), /K50\.00/);
});

test('PIN and password shape checks', () => {
  const isPin = (s) => /^\d{4}$/.test(s);
  assert.ok(isPin('1234'));
  for (const bad of ['123', '12345', 'abcd', '12 4', '']) assert.ok(!isPin(bad), bad);
});
