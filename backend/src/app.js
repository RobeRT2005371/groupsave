import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { authenticate, errorHandler, portalAuthenticate } from './middleware.js';
import { portalAuth, portal } from './routes/portal.js';
import { groupJoin, membershipRequests } from './routes/group-join.js';
import auth from './routes/auth.js';
import members from './routes/members.js';
import cycles from './routes/cycles.js';
import postings from './routes/postings.js';
import loans from './routes/loans.js';
import ussd from './routes/ussd.js';
import reports from './routes/reports.js';
import rateLimit from 'express-rate-limit';
import { disputes, receipts, auditRoute, outbox } from './routes/misc.js';
import meetings from './routes/meetings.js';
import alerts from './routes/alerts.js';
import { loanRequests, announcements } from './routes/requests.js';
import payments from './routes/payments.js';
import ops from './routes/ops.js';
import { extras } from './routes/extras.js';
import { chat } from './routes/chat.js';

export function createApp() {
  const app = express();
  // When FRONTEND_DIR is set (single-service hosting) the API also serves the built React app.
  const frontendDir = process.env.FRONTEND_DIR;
  app.use(helmet(frontendDir ? { contentSecurityPolicy: false } : undefined));
  app.use(cors({ origin: config.corsOrigin }));
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false })); // USSD gateway posts form data

  app.get('/health', (_req, res) => res.json({ ok: true }));
  const limit = (n) => rateLimit({ windowMs: 60000, limit: n, standardHeaders: true, legacyHeaders: false });
  app.use('/ussd', limit(300), ussd);
  app.use('/api/portal-auth', portalAuth);
  app.use('/api/portal', limit(120), portalAuthenticate, portal);
  app.use('/api/group-join', limit(120), groupJoin);
  app.use('/api/auth', auth);
  app.use('/api', limit(300), authenticate);
  app.use('/api/reports', reports);
  app.use('/api/members', members);
  app.use('/api/cycles', cycles);
  app.use('/api/postings', postings);
  app.use('/api/loans', loans);
  app.use('/api/disputes', disputes);
  app.use('/api/receipts', receipts);
  app.use('/api/audit', auditRoute);
  app.use('/api/meetings', meetings);
  app.use('/api/alerts', alerts);
  app.use('/api/loan-requests', loanRequests);
  app.use('/api/announcements', announcements);
  app.use('/api/membership-requests', membershipRequests);
  app.use('/api/payments', payments);
  app.use('/api/chat', chat);
  app.use('/api/ops', ops);
  app.use('/api/extras', extras);
  app.use('/api/outbox', outbox);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  if (frontendDir) {
    const dir = path.resolve(frontendDir);
    app.use(express.static(dir, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!ussd|health).*/, (_req, res) => res.sendFile(path.join(dir, 'index.html')));
  }
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
