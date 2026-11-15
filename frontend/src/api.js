import { tr } from './i18n.jsx';
import { addOfflineWrite, readOfflineSnapshot, saveOfflineSnapshot } from './offlineQueue.js';
// Token lives in sessionStorage so it is cleared when the browser closes.
const KEY = 'groupsave_token';
export const getToken = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ } };

export class ApiError extends Error {
  constructor(m, data, status) {
    super(m);
    this.data = data;
    this.status = status;
  }
}

export function getSessionIdentity() {
  try {
    const payload = JSON.parse(atob(getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.id && payload.groupId ? { id: payload.id, groupId: payload.groupId, scope: payload.scope } : null;
  } catch {
    return null;
  }
}

const cacheableRead = (path) =>
  ['/auth/me', '/members', '/cycles', '/meetings'].includes(path) || /^\/meetings\/\d+$/.test(path);

function offlineWrite(path, method, body) {
  if (method !== 'POST') return false;
  return (path === '/postings' && body?.type === 'contribution') || /^\/meetings\/\d+\/attendance$/.test(path);
}

function newIdempotencyKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function api(path, { method = 'GET', body, idempotencyKey, queueOffline = true, offlineLabel } = {}) {
  const canQueue = queueOffline && offlineWrite(path, method, body);
  const key = canQueue ? (idempotencyKey || newIdempotencyKey()) : idempotencyKey;
  const headers = {
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}),
    ...(key ? { 'Idempotency-Key': key } : {}),
  };
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (error) {
    const identity = getSessionIdentity();
    if (method === 'GET' && cacheableRead(path)) {
      const cached = await readOfflineSnapshot(path, identity);
      if (cached !== null) return cached;
    }
    if (canQueue) {
      return addOfflineWrite({
        path,
        body,
        key,
        identity,
        label: offlineLabel || (path === '/postings' ? 'Contribution entry' : `Attendance for meeting ${path.split('/')[2]}`),
      });
    }
    throw error;
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken() && !path.startsWith('/auth/')) { setToken(null); location.reload(); }
  if (!res.ok) throw new ApiError(tr(data.error || 'Request failed'), data, res.status);
  if (method === 'GET' && cacheableRead(path)) {
    try {
      await saveOfflineSnapshot(path, data, getSessionIdentity());
    } catch (error) {
      console.warn('Offline cache', error.message);
    }
  }
  return data;
}

/** Download a file endpoint with the auth header. */
export async function download(path, filename) {
  const res = await fetch('/api' + path, { headers: { Authorization: 'Bearer ' + getToken() } });
  if (!res.ok) throw new Error(tr('Download failed'));
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const kwacha = (n) => 'K' + (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "12.50" -> 1250 ngwee; returns null for invalid input. */
export const toNgwee = (s) => {
  const v = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null;
};
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); // numeric, so no month names to translate

/** True when the stored session is a member-portal session (the server enforces this; this only picks which screens to show). */
export function isPortal() {
  try { return JSON.parse(atob(getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).scope === 'portal'; } catch { return false; }
}

export function isApplicant() {
  try { return JSON.parse(atob(getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).scope === 'applicant'; } catch { return false; }
}

/** Open a meeting link in a new tab. The tab is opened first so popup blockers allow it. */
export async function openMeeting(path) {
  const w = window.open('', '_blank');
  try {
    const r = await api(path, { method: 'POST' });
    if (w) { w.opener = null; w.location.href = r.url; } else window.location.href = r.url;
  } catch (e) { if (w) w.close(); throw e; }
}
