import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q, tx } from '../db.js';
import { encrypt, decrypt, phoneHash, normalizePhone } from '../security.js';
import { wrap, httpError, requireRole } from '../middleware.js';
import { audit } from '../ledger.js';
import { isLang } from '../i18n.js';

const r = Router();
const ROLES = ['chairperson', 'treasurer', 'secretary', 'auditor', 'member'];

r.get('/', wrap(async (req, res) => {
  const { rows } = await q(
    'SELECT id, full_name, phone_enc, role, status, language, (pin_hash IS NOT NULL) AS pin_set, pin_failures, (pin_setup_until > now()) AS setup_open FROM members WHERE group_id=$1 ORDER BY id',
    [req.user.groupId],
  );
  res.json(rows.map(({ phone_enc, ...m }) => ({ ...m, phone: decrypt(phone_enc), locked: m.pin_failures >= 3 })));
}));

r.post('/', requireRole('chairperson', 'secretary'), wrap(async (req, res) => {
  const { fullName, phone, role = 'member', password } = req.body;
  const p = normalizePhone(phone);
  if (!fullName || !p) throw httpError(400, 'Name and a valid phone number are required');
  if (!ROLES.includes(role)) throw httpError(400, 'Bad role');
  if (role !== 'member' && req.user.role !== 'chairperson') throw httpError(403, 'Only the chairperson can add officers');
  if (role !== 'member' && (!password || password.length < 8)) throw httpError(400, 'Officers need a password of 8+ characters');
  const row = await tx(async (c) => {
    const m = await c.query(
      `INSERT INTO members (group_id,full_name,phone_enc,phone_hash,password_hash,role,pin_setup_until)
       VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $6 = 'member' THEN now() + interval '7 days' END)
       RETURNING id, full_name, role, status`,
      [req.user.groupId, fullName, encrypt(p), phoneHash(p), role !== 'member' ? await bcrypt.hash(password, 10) : null, role],
    );
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'member.create', entity: `member:${m.rows[0].id}`, after: { role } });
    return m.rows[0];
  });
  res.status(201).json(row);
}));

// Change role/status or reset a member's PIN (they pick a new one on next dial). Officers never see PINs.
r.patch('/:id', requireRole('chairperson', 'secretary'), wrap(async (req, res) => {
  const { role, status, resetPin, language, setPin, allowSetup } = req.body;
  if (setPin !== undefined && !/^\d{4}$/.test(String(setPin))) throw httpError(400, 'PIN must be exactly 4 digits');
  if (language !== undefined && !isLang(language)) throw httpError(400, 'Unknown language');
  const { rows } = await q('SELECT * FROM members WHERE id=$1 AND group_id=$2', [req.params.id, req.user.groupId]);
  const m = rows[0];
  if (!m) throw httpError(404, 'Member not found');
  if (role !== undefined && req.user.role !== 'chairperson') throw httpError(403, 'Only the chairperson can change roles');
  if (role !== undefined && !ROLES.includes(role)) throw httpError(400, 'Bad role');
  if (role && role !== 'member' && !m.password_hash) throw httpError(400, 'Officer accounts need a password; add them as a new officer');
  if (status !== undefined && !['active', 'exited'].includes(status)) throw httpError(400, 'Bad status');
  await tx(async (c) => {
    await c.query(
      `UPDATE members SET role=COALESCE($2,role), status=COALESCE($3,status), exited_at = CASE WHEN $3 = 'exited' AND status <> 'exited' THEN now() WHEN $3 = 'active' THEN NULL ELSE exited_at END, language=COALESCE($5,language),
         pin_hash = CASE WHEN $6::text IS NOT NULL THEN $6 WHEN $4 THEN NULL ELSE pin_hash END,
         pin_failures = CASE WHEN $4 OR $6::text IS NOT NULL THEN 0 ELSE pin_failures END,
         portal_password_hash = CASE WHEN $4 THEN NULL ELSE portal_password_hash END,
         pin_setup_until = CASE WHEN $4 OR $7 THEN now() + interval '24 hours' WHEN $6::text IS NOT NULL THEN NULL ELSE pin_setup_until END WHERE id=$1`,
      [m.id, role ?? null, status ?? null, !!resetPin, language ?? null, setPin !== undefined ? await bcrypt.hash(String(setPin), 10) : null, !!allowSetup],
    );
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'member.update', entity: `member:${m.id}`, before: { role: m.role, status: m.status }, after: { role, status, resetPin: !!resetPin, setPin: setPin !== undefined } });
  });
  res.json({ ok: true });
}));


// Delete only a member with no history. Anyone with ledger entries, loans or disputes must be marked exited instead.
r.delete('/:id', requireRole('chairperson'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw httpError(400, 'You cannot delete your own account');
  await tx(async (c) => {
    const m = (await c.query('SELECT * FROM members WHERE id=$1 AND group_id=$2 FOR UPDATE', [id, req.user.groupId])).rows[0];
    if (!m) throw httpError(404, 'Member not found');
    const used = await c.query(
      `SELECT 1 FROM postings WHERE member_id=$1 OR recorded_by=$1 UNION ALL SELECT 1 FROM loans WHERE member_id=$1 OR approved_by=$1
       UNION ALL SELECT 1 FROM disputes WHERE member_id=$1 OR resolved_by=$1 UNION ALL SELECT 1 FROM meetings WHERE recorded_by=$1
       UNION ALL SELECT 1 FROM loan_requests WHERE member_id=$1 OR decided_by=$1 UNION ALL SELECT 1 FROM announcements WHERE author_id=$1
       UNION ALL SELECT 1 FROM rotation_turns WHERE member_id=$1 LIMIT 1`, [id]);
    if (used.rowCount) throw httpError(409, 'This member has ledger history, so they cannot be deleted. Mark them as exited instead.');
    await c.query('DELETE FROM attendance WHERE member_id=$1', [id]);
    await c.query('DELETE FROM notifications WHERE member_id=$1', [id]);
    await c.query('DELETE FROM member_otps WHERE member_id=$1', [id]);
    await c.query('DELETE FROM alert_dismissals WHERE member_id=$1', [id]);
    await c.query('DELETE FROM idempotency_keys WHERE actor_id=$1', [id]);
    // Keep the join request as a record, but unlink it from the member being deleted.
    await c.query('UPDATE group_join_requests SET member_id=NULL WHERE member_id=$1', [id]);
    await c.query('UPDATE group_join_requests SET decided_by=NULL WHERE decided_by=$1', [id]);
    await c.query('DELETE FROM members WHERE id=$1', [id]);
    await audit(c, { groupId: req.user.groupId, actor: req.user.id, action: 'member.delete', entity: `member:${id}`, before: { name: m.full_name, role: m.role } });
  });
  res.json({ ok: true });
}));

export default r;
