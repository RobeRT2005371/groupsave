import crypto from 'node:crypto';
import { config } from './config.js';
import { q } from './db.js';

export const newRoom = () => 'groupsave-' + crypto.randomBytes(12).toString('hex');

/** Join link with the person's name filled in. The room name is the secret, so only group members are ever given it. */
export const joinUrl = (room, name) =>
  `${config.jitsiBase}/${room}#userInfo.displayName=${encodeURIComponent(JSON.stringify(name))}&config.prejoinPageEnabled=false`;

/** Joining counts as attending (never overrides an absence fine that was already applied). */
export async function markJoined(meetingId, memberId) {
  await q(
    `INSERT INTO attendance (meeting_id, member_id, present, fined) VALUES ($1,$2,true,false)
     ON CONFLICT (meeting_id, member_id) DO UPDATE SET present=true WHERE attendance.fined=false`, [meetingId, memberId]);
}
