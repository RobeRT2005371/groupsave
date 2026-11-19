import test from 'node:test';
import assert from 'node:assert/strict';
import { retentionPolicy } from '../src/retention.js';

test('retention defaults keep short-lived data short and personal data bounded', () => {
  const p = retentionPolicy();
  assert.equal(p.notificationDays, 90);
  assert.equal(p.otpDays, 1);
  assert.equal(p.exitedMemberDays, 365);
});

test('retention settings can be tuned from the environment; bad values fall back to defaults', () => {
  process.env.RETENTION_NOTIFICATIONS_DAYS = '30';
  process.env.RETENTION_MESSAGES_DAYS = 'abc';
  process.env.RETENTION_EXITED_MEMBER_DAYS = '0';
  const p = retentionPolicy();
  assert.equal(p.notificationDays, 30);
  assert.equal(p.messageDays, 365);
  assert.equal(p.exitedMemberDays, 365);
  delete process.env.RETENTION_NOTIFICATIONS_DAYS; delete process.env.RETENTION_MESSAGES_DAYS; delete process.env.RETENTION_EXITED_MEMBER_DAYS;
});
