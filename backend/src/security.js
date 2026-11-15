import crypto from 'node:crypto';
import { config } from './config.js';

const key = crypto.createHash('sha256').update(config.encKey).digest();

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

export function decrypt(blob) {
  const [iv, tag, enc] = blob.split('.').map((s) => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

export const phoneHash = (phone) => crypto.createHmac('sha256', key).update(phone).digest('hex');

/** Normalise Zambian numbers to +260XXXXXXXXX. */
export function normalizePhone(input) {
  let p = String(input || '').replace(/[\s()-]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('0')) p = '+260' + p.slice(1);
  else if (p.startsWith('260')) p = '+' + p;
  if (!/^\+\d{10,14}$/.test(p)) return null;
  return p;
}

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---- TOTP (RFC 6238), compatible with Google Authenticator / Authy ----
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = '', out = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function b32decode(s) {
  let bits = '';
  for (const ch of s) bits += B32.indexOf(ch).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}
export function verifyTotp(secret, code, now = Date.now()) {
  const c = Math.floor(now / 30000);
  const given = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(given)) return false;
  return [-1, 0, 1].some((d) => hotp(secret, c + d) === given);
}
export const totpNow = (secret) => hotp(secret, Math.floor(Date.now() / 30000));
