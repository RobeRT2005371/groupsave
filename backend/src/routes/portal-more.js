import { q, tx } from '../db.js';
import { wrap, httpError } from '../middleware.js';
import { audit } from '../ledger.js';
import { loanLimit, buildSchedule, kwacha } from '../rules.js';
import { t } from '../i18n.js';
import { decrypt } from '../security.js';
import bcrypt from 'bcryptjs';

const db = { query: q };

/** Extra member-portal endpoints: loan requests, announcements and "download my data". */
export function addPortalMore(portal) {
  portal.get('/announcements', wrap(async (req, res) => {
    const { rows } = await q('SELECT id, body, created_at FROM announcements WHERE group_id=$1 ORDER BY id DESC LIMIT 20', [req.user.groupId]);
    res.json(rows);
  }));

  portal.get('/loan-requests', wrap(async (req, res) => {
    const { rows } = await q(`SELECT lr.id, lr.amount, lr.instalments, lr.status, lr.note, lr.created_at, lr.decided_at, lr.guarantor_status, g.full_name AS guarantor_name,
            (SELECT COUNT(*)::int FROM loan_request_approvals a WHERE a.request_id=lr.id) AS approvals
     FROM loan_requests lr LEFT JOIN members g ON g.id=lr.guarantor_id WHERE lr.member_id=$1 ORDER BY lr.id DESC LIMIT 20`, [req.user.id]);
    res.json(rows);
  }));

  portal.post('/loan-requests', wrap(async (req, res) => {
    const amount = Number(req.body.amount);
    const instalments = Number(req.body.instalments);
    const guarantorId = req.body.guarantorId ? Number(req.body.guarantorId) : null;
    if (!Number.isInteger(amount) || amount <= 0) throw httpError(400, 'Amount must be positive ngwee');
    if (guarantorId !== null && (!Number.isInteger(guarantorId) || guarantorId === req.user.id)) throw httpError(400, 'Choose another member as guarantor');
    if (!Number.isInteger(instalments) || instalments < 1 || instalments > 60) throw httpError(400, 'Instalments must be 1-60');
    const row = await tx(async (c) => {
      const member = (await c.query(
        "SELECT id FROM members WHERE id=$1 AND group_id=$2 AND status='active' FOR UPDATE",
        [req.user.id, req.user.groupId],
      )).rows[0];
      if (!member) throw httpError(404, 'Member not found or not active');
      const cycle = (await c.query(
        "SELECT * FROM cycles WHERE group_id=$1 AND status='open' FOR SHARE",
        [req.user.groupId],
      )).rows[0];
      if (!cycle) throw httpError(400, 'No open cycle');
      if ((await c.query("SELECT 1 FROM loan_requests WHERE member_id=$1 AND status='pending'", [req.user.id])).rowCount) {
        throw httpError(409, 'You already have a request waiting for a decision');
      }
      const sav = (await c.query(
        "SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE cycle_id=$1 AND member_id=$2 AND type='contribution'",
        [cycle.id, req.user.id],
      )).rows[0].s;
      const owed = (await c.query(
        `SELECT COALESCE(SUM(s.principal_due - LEAST(s.paid_amount, s.principal_due)),0) AS o
         FROM loans l JOIN schedule_items s ON s.loan_id=l.id
         WHERE l.cycle_id=$1 AND l.member_id=$2 AND l.status='active'`,
        [cycle.id, req.user.id],
      )).rows[0].o;
      const limit = loanLimit(sav, cycle.rules.loan_limit_multiple) - owed;
      if (amount > limit) throw httpError(400, `Above this member's loan limit (${limit} ngwee available)`);
      let guarantor = null;
      if (guarantorId !== null) {
        guarantor = (await c.query("SELECT id, language FROM members WHERE id=$1 AND group_id=$2 AND status='active' AND role='member'", [guarantorId, req.user.groupId])).rows[0];
        if (!guarantor) throw httpError(400, 'Guarantor must be an active member of your group');
      }
      const created = (await c.query(
        'INSERT INTO loan_requests (member_id, cycle_id, amount, instalments, guarantor_id, guarantor_status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [req.user.id, cycle.id, amount, instalments, guarantor?.id ?? null, guarantor ? 'pending' : null],
      )).rows[0];
      if (guarantor) {
        const me = (await c.query('SELECT full_name FROM members WHERE id=$1', [req.user.id])).rows[0];
        await c.query('INSERT INTO notifications (member_id, body) VALUES ($1,$2)', [guarantor.id, t(guarantor.language, 'guarantorAsk', { name: me.full_name, amt: kwacha(amount) })]);
      }
      await audit(c, {
        groupId: req.user.groupId,
        actor: req.user.id,
        action: 'loanrequest.create',
        entity: `loanrequest:${created.id}`,
        after: { amount, instalments },
      });
      return created;
    });
    res.status(201).json({ id: row.id });
  }));

  portal.post('/loan-requests/:id/cancel', wrap(async (req, res) => {
    await tx(async (c) => {
      const { rowCount } = await c.query(
        "UPDATE loan_requests SET status='cancelled', decided_at=now() WHERE id=$1 AND member_id=$2 AND status='pending'",
        [Number(req.params.id), req.user.id],
      );
      if (!rowCount) throw httpError(404, 'Loan request not found');
      await audit(c, {
        groupId: req.user.groupId,
        actor: req.user.id,
        action: 'loanrequest.cancel',
        entity: `loanrequest:${req.params.id}`,
      });
    });
    res.json({ ok: true });
  }));

  // ---- loan calculator: what would a loan cost, and how much can I borrow? ----
  portal.post('/loan-calc', wrap(async (req, res) => {
    const amount = Number(req.body.amount);
    const instalments = Number(req.body.instalments);
    if (!Number.isInteger(amount) || amount <= 0) throw httpError(400, 'Enter a valid amount');
    if (!Number.isInteger(instalments) || instalments < 1 || instalments > 60) throw httpError(400, 'Instalments must be 1-60');
    const cycle = (await q("SELECT * FROM cycles WHERE group_id=$1 AND status='open'", [req.user.groupId])).rows[0];
    if (!cycle) throw httpError(400, 'No open cycle');
    const r = cycle.rules;
    const sav = Number((await q("SELECT COALESCE(SUM(amount),0) AS s FROM postings WHERE cycle_id=$1 AND member_id=$2 AND type='contribution'", [cycle.id, req.user.id])).rows[0].s);
    const owed = Number((await q(`SELECT COALESCE(SUM(s.principal_due - LEAST(s.paid_amount, s.principal_due)),0) AS o FROM loans l JOIN schedule_items s ON s.loan_id=l.id
      WHERE l.cycle_id=$1 AND l.member_id=$2 AND l.status='active'`, [cycle.id, req.user.id])).rows[0].o);
    const limit = Math.max(0, loanLimit(sav, r.loan_limit_multiple) - owed);
    const items = buildSchedule({ principal: amount, rateBps: r.interest_bps, basis: r.interest_basis, instalments, startDate: new Date().toISOString().slice(0, 10), frequency: r.frequency });
    const interest = items.reduce((a, i) => a + i.interestDue, 0);
    res.json({ limit, withinLimit: amount <= limit, interest, total: amount + interest, frequency: r.frequency, items });
  }));

  // ---- guarantor: members asked to back someone's loan ----
  portal.get('/guarantee-requests', wrap(async (req, res) => {
    const { rows } = await q(
      `SELECT lr.id, lr.amount, lr.instalments, m.full_name AS borrower
       FROM loan_requests lr JOIN members m ON m.id=lr.member_id
       WHERE lr.guarantor_id=$1 AND lr.guarantor_status='pending' AND lr.status='pending' ORDER BY lr.id DESC`, [req.user.id]);
    res.json(rows);
  }));
  for (const [verb, status] of [['accept', 'accepted'], ['decline', 'declined']]) {
    portal.post('/guarantee-requests/:id/' + verb, wrap(async (req, res) => {
      const { rowCount } = await q("UPDATE loan_requests SET guarantor_status=$3 WHERE id=$1 AND guarantor_id=$2 AND guarantor_status='pending' AND status='pending'", [Number(req.params.id), req.user.id, status]);
      if (!rowCount) throw httpError(404, 'Request not found');
      await audit(db, { groupId: req.user.groupId, actor: req.user.id, action: 'guarantee.' + verb, entity: `loanrequest:${req.params.id}` });
      res.json({ ok: true });
    }));
  }

  // Member changes their own PIN (the same 4-digit PIN works for USSD and the portal).
  portal.post('/change-pin', wrap(async (req, res) => {
    const cur = String(req.body.currentPin || ''), next = String(req.body.newPin || '');
    if (!/^\d{4}$/.test(next)) throw httpError(400, 'Choose a PIN of exactly 4 digits');
    const m = (await q('SELECT id, pin_hash, pin_failures FROM members WHERE id=$1', [req.user.id])).rows[0];
    if (m.pin_failures >= 3) throw httpError(423, 'Too many wrong PINs. Ask an officer to reset your PIN.');
    if (!m.pin_hash || !(await bcrypt.compare(cur, m.pin_hash))) {
      await q('UPDATE members SET pin_failures=pin_failures+1 WHERE id=$1', [m.id]);
      throw httpError(401, 'Your current PIN is wrong');
    }
    await q('UPDATE members SET pin_hash=$2, pin_failures=0 WHERE id=$1', [m.id, await bcrypt.hash(next, 10)]);
    await audit(db, { groupId: req.user.groupId, actor: m.id, action: 'portal.pin.changed', entity: `member:${m.id}` });
    res.json({ ok: true });
  }));

  // Member chooses a longer password (8+ characters) for the web portal. Needs the current PIN or password.
  portal.post('/change-password', wrap(async (req, res) => {
    const cur = String(req.body.current || ''), next = String(req.body.newPassword || '');
    if (next.length < 8) throw httpError(400, 'Password must be at least 8 characters');
    if (next.length > 72) throw httpError(400, 'Password is too long (72 characters max)');
    const m = (await q('SELECT id, pin_hash, portal_password_hash, pin_failures FROM members WHERE id=$1', [req.user.id])).rows[0];
    if (m.pin_failures >= 3) throw httpError(423, 'Too many wrong PINs. Ask an officer to reset your PIN.');
    const ok = (/^\d{4}$/.test(cur) && !!m.pin_hash && (await bcrypt.compare(cur, m.pin_hash)))
      || (cur.length >= 8 && !!m.portal_password_hash && (await bcrypt.compare(cur, m.portal_password_hash)));
    if (!ok) {
      await q('UPDATE members SET pin_failures=pin_failures+1 WHERE id=$1', [m.id]);
      throw httpError(401, 'Your current PIN or password is wrong');
    }
    await q('UPDATE members SET portal_password_hash=$2, pin_failures=0 WHERE id=$1', [m.id, await bcrypt.hash(next, 10)]);
    await audit(db, { groupId: req.user.groupId, actor: m.id, action: 'portal.password.set', entity: `member:${m.id}` });
    res.json({ ok: true });
  }));

  // Online contributions: the member reports a mobile-money payment; an officer confirms it before it is recorded.
  portal.get('/payments', wrap(async (req, res) => {
    const { rows } = await q('SELECT id, loan_id, amount, method, reference, status, note, created_at FROM online_payments WHERE member_id=$1 ORDER BY id DESC LIMIT 20', [req.user.id]);
    res.json(rows);
  }));

  portal.post('/payments', wrap(async (req, res) => {
    const amount = Number(req.body.amount);
    const method = String(req.body.method || '').trim().slice(0, 30);
    const reference = String(req.body.reference || '').trim().slice(0, 60);
    const loanId = req.body.loanId ? Number(req.body.loanId) : null;
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100_000_000) throw httpError(400, 'Enter a valid amount');
    if (!method) throw httpError(400, 'Choose how you paid');
    if (reference.length < 4) throw httpError(400, 'Enter the transaction ID from your payment message');
    const cycle = (await q("SELECT id FROM cycles WHERE group_id=$1 AND status='open'", [req.user.groupId])).rows[0];
    if (!cycle) throw httpError(400, 'No open cycle');
    if (loanId !== null) {
      const owed = (await q(
        `SELECT COALESCE(SUM(s.principal_due + s.interest_due - s.paid_amount),0) AS o FROM loans l JOIN schedule_items s ON s.loan_id=l.id
         WHERE l.id=$1 AND l.member_id=$2 AND l.cycle_id=$3 AND l.status='active'`, [loanId, req.user.id, cycle.id])).rows[0];
      if (!owed || Number(owed.o) <= 0) throw httpError(404, 'Loan not found');
      if (amount > Number(owed.o)) throw httpError(400, 'That is more than you still owe on this loan');
    }
    try {
      const row = (await q(
        'INSERT INTO online_payments (group_id, cycle_id, member_id, amount, method, reference, loan_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [req.user.groupId, cycle.id, req.user.id, amount, method, reference, loanId])).rows[0];
      await audit(db, { groupId: req.user.groupId, actor: req.user.id, action: 'onlinepayment.create', entity: `onlinepayment:${row.id}`, after: { amount, method } });
      res.status(201).json({ id: row.id });
    } catch (e) {
      if (e.code === '23505') throw httpError(409, 'That transaction ID has already been submitted');
      throw e;
    }
  }));

  portal.post('/payments/:id/cancel', wrap(async (req, res) => {
    const { rowCount } = await q("UPDATE online_payments SET status='cancelled', decided_at=now() WHERE id=$1 AND member_id=$2 AND status='pending'", [Number(req.params.id), req.user.id]);
    if (!rowCount) throw httpError(404, 'Pending payment not found');
    res.json({ ok: true });
  }));

  // Right of access under the Data Protection Act: everything held about this member, as a file.
  portal.get('/my-data', wrap(async (req, res) => {
    const id = req.user.id;
    const me = (await q('SELECT m.id, m.full_name, m.phone_enc, m.role, m.status, m.language, m.created_at, g.name AS group_name FROM members m JOIN groups g ON g.id=m.group_id WHERE m.id=$1', [id])).rows[0];
    const { phone_enc, ...profile } = me;
    const data = {
      exportedAt: new Date().toISOString(),
      profile: { ...profile, phone: decrypt(phone_enc) },
      entries: (await q('SELECT id, cycle_id, type, amount, running_balance, created_at FROM postings WHERE member_id=$1 ORDER BY id', [id])).rows,
      loans: (await q('SELECT id, principal, rate_bps, basis, instalments, status, disbursed_at FROM loans WHERE member_id=$1 ORDER BY id', [id])).rows,
      loanRequests: (await q('SELECT id, amount, instalments, status, created_at FROM loan_requests WHERE member_id=$1 ORDER BY id', [id])).rows,
      queries: (await q('SELECT id, posting_id, status, raised_at, resolution_note FROM disputes WHERE member_id=$1 ORDER BY id', [id])).rows,
      attendance: (await q('SELECT meeting_id, present, fined FROM attendance WHERE member_id=$1 ORDER BY meeting_id', [id])).rows,
      messages: (await q('SELECT body, status, created_at FROM notifications WHERE member_id=$1 ORDER BY id', [id])).rows,
    };
    await audit(db, { groupId: req.user.groupId, actor: id, action: 'mydata.download', entity: `member:${id}` });
    res.setHeader('Content-Disposition', 'attachment; filename="my-groupsave-data.json"');
    res.json(data);
  }));
}
