import { Router } from 'express';
import { q } from '../db.js';
import { wrap, requireRole } from '../middleware.js';

const r = Router();
// Server-wide (not per group), so only the chairperson sees it, and only the message and where it happened.
r.get('/errors', requireRole('chairperson'), wrap(async (_req, res) => {
  const { rows } = await q("SELECT id, method, path, message, created_at FROM error_log WHERE created_at > now() - interval '7 days' ORDER BY id DESC LIMIT 50");
  res.json(rows);
}));
export default r;
