import { Router } from 'express';
import { q, tx } from '../db.js';
import { decrypt, encrypt, normalizePhone, phoneHash } from '../security.js';
import { httpError, requireRole, wrap } from '../middleware.js';
import { audit } from '../ledger.js';

export const groupJoin = Router();

groupJoin.get('/groups', wrap(async (req, res) => {
  const search = String(req.query.q || '').trim().toLowerCase();
  if (search.length < 2 || search.length > 60) throw httpError(400, 'Enter 2 to 60 characters to search');
  const { rows } = await q(
    `SELECT id, name, location FROM groups
     WHERE position($1 in lower(name)) > 0 OR position($1 in lower(COALESCE(location,''))) > 0
     ORDER BY name, id LIMIT 20`,
    [search],
  );
  res.json(rows);
}));

groupJoin.post('/requests', wrap(async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const phone = normalizePhone(req.body.phone);
  const groupId = Number(req.body.groupId);
  if (!fullName || fullName.length > 120 || !phone) throw httpError(400, 'Enter your name and a valid phone number');
  if (!Number.isInteger(groupId) || groupId <= 0) throw httpError(400, 'Choose a group');
  const hash = phoneHash(phone);

  try {
    const row = await tx(async (c) => {
      if ((await c.query('SELECT 1 FROM groups WHERE id=$1', [groupId])).rowCount === 0) {
        throw httpError(404, 'Group not found');
      }
      if ((await c.query('SELECT 1 FROM members WHERE phone_hash=$1', [hash])).rowCount) {
        throw httpError(409, 'This phone number already belongs to a member. Sign in to the member portal instead.');
      }
      const applicant = (await c.query(
        `INSERT INTO group_applicants (full_name, phone_enc, phone_hash) VALUES ($1,$2,$3)
         ON CONFLICT (phone_hash) DO UPDATE
         SET full_name=EXCLUDED.full_name, phone_enc=EXCLUDED.phone_enc
         RETURNING id`,
        [fullName, encrypt(phone), hash],
      )).rows[0];
      if ((await c.query(
        "SELECT 1 FROM group_join_requests WHERE applicant_id=$1 AND status='pending' FOR UPDATE",
        [applicant.id],
      )).rowCount) throw httpError(409, 'You already have a pending group request');
      const request = (await c.query(
        `INSERT INTO group_join_requests (group_id, applicant_id) VALUES ($1,$2)
         RETURNING id, status, created_at`,
        [groupId, applicant.id],
      )).rows[0];
      await audit(c, {
        groupId,
        actor: null,
        action: 'group.join.request',
        entity: `group_join_request:${request.id}`,
        after: { fullName },
      });
      return request;
    });
    res.status(201).json(row);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'group_join_requests_one_pending_applicant') {
      throw httpError(409, 'You already have a pending group request');
    }
    throw error;
  }
}));

export const membershipRequests = Router();

membershipRequests.get('/', requireRole('chairperson', 'secretary'), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT r.id, r.created_at, a.full_name, a.phone_enc, g.name AS group_name, g.location
     FROM group_join_requests r
     JOIN group_applicants a ON a.id=r.applicant_id
     JOIN groups g ON g.id=r.group_id
     WHERE r.group_id=$1 AND r.status='pending'
     ORDER BY r.created_at, r.id`,
    [req.user.groupId],
  );
  res.json(rows.map(({ phone_enc, ...row }) => ({ ...row, phone: decrypt(phone_enc) })));
}));

async function decideRequest(req, status) {
  try {
    return await tx(async (c) => {
      const request = (await c.query(
        `SELECT r.*, a.full_name, a.phone_enc, a.phone_hash
         FROM group_join_requests r JOIN group_applicants a ON a.id=r.applicant_id
         WHERE r.id=$1 AND r.group_id=$2 FOR UPDATE OF r, a`,
        [req.params.id, req.user.groupId],
      )).rows[0];
      if (!request) throw httpError(404, 'Group request not found');
      if (request.status !== 'pending') throw httpError(409, 'This request has already been decided');

      let memberId = null;
      if (status === 'approved') {
        try {
          const member = (await c.query(
            // Approval is the officer's check, so the new member may choose their own PIN/password for 7 days.
            `INSERT INTO members (group_id, full_name, phone_enc, phone_hash, role, pin_setup_until)
             VALUES ($1,$2,$3,$4,'member', now() + interval '7 days') RETURNING id`,
            [request.group_id, request.full_name, request.phone_enc, request.phone_hash],
          )).rows[0];
          memberId = member.id;
        } catch (error) {
          if (error.code === '23505') {
            throw httpError(409, 'This phone number is already registered as a member');
          }
          throw error;
        }
      }
      await c.query(
        `UPDATE group_join_requests
         SET status=$2, decided_by=$3, member_id=$4, decided_at=now()
         WHERE id=$1`,
        [request.id, status, req.user.id, memberId],
      );
      await audit(c, {
        groupId: request.group_id,
        actor: req.user.id,
        action: `group.join.${status}`,
        entity: `group_join_request:${request.id}`,
        after: { applicantId: request.applicant_id, memberId },
      });
      return { id: request.id, status };
    });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'group_join_requests_one_pending_applicant') {
      throw httpError(409, 'This applicant already has a pending group request');
    }
    throw error;
  }
}

membershipRequests.post('/:id/approve', requireRole('chairperson', 'secretary'), wrap(async (req, res) => {
  res.json(await decideRequest(req, 'approved'));
}));

membershipRequests.post('/:id/reject', requireRole('chairperson', 'secretary'), wrap(async (req, res) => {
  res.json(await decideRequest(req, 'rejected'));
}));
