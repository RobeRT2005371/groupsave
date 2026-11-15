import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { q } from './db.js';

export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function authenticate(req, _res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next(httpError(401, 'Login required'));
  try {
    req.user = jwt.verify(h.slice(7), config.jwtSecret);
    if (req.user.scope === 'portal' || req.user.scope === 'applicant') return next(httpError(403, 'Officer access only'));
    if (req.user.role === 'auditor' && !['GET', 'HEAD'].includes(req.method)) return next(httpError(403, 'Auditors can view records but not change them'));
    next();
  } catch {
    next(httpError(401, 'Session expired'));
  }
}

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(httpError(403, 'Not permitted for your role'));

export function errorHandler(err, req, res, _next) {
  if (!err.status) {
    console.error(err);
    q('INSERT INTO error_log (method, path, message, stack) VALUES ($1,$2,$3,$4)', [req.method, String(req.originalUrl || '').split('?')[0].slice(0, 200), String(err.message).slice(0, 500), String(err.stack || '').slice(0, 2000)]).catch(() => {});
  }
  const status = err.status || (err.code === '23505' ? 409 : 500);
  // Never leak database details; a duplicate means the phone number is already used by someone.
  const message = err.code === '23505' ? 'That phone number is already registered' : status === 500 ? 'Server error' : err.message;
  res.status(status).json({ error: message });
}

export const signToken = (m) =>
  jwt.sign({ id: m.id, groupId: m.group_id, role: m.role, name: m.full_name }, config.jwtSecret, { expiresIn: '12h' });

// ---- Member portal tokens: separate scope so a member can never reach officer endpoints ----
export const signPortalToken = (m) =>
  jwt.sign({ id: m.id, groupId: m.group_id, role: 'member', scope: 'portal' }, config.jwtSecret, { expiresIn: '2h' });

export function portalAuthenticate(req, _res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next(httpError(401, 'Please sign in'));
  try {
    const u = jwt.verify(h.slice(7), config.jwtSecret);
    if (u.scope !== 'portal') return next(httpError(403, 'Not a member session'));
    req.user = u;
    next();
  } catch {
    next(httpError(401, 'Session expired'));
  }
}
