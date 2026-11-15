// Demo data: one simulated group with a treasurer, 5 members and an open cycle.
import bcrypt from 'bcryptjs';
import { tx, pool } from './db.js';
import { encrypt, phoneHash } from './security.js';
import { validateRules } from './rules.js';
import { addPosting } from './ledger.js';

const people = [
  ['Mary Banda', '+260971000001', 'chairperson'],
  ['Grace Phiri', '+260971000002', 'treasurer'],
  ['Joyce Mwale', '+260971000003', 'secretary'],
  ['Esther Zulu', '+260971000004', 'member'],
  ['Ruth Tembo', '+260971000005', 'member'],
  ['Agnes Daka', '+260971000006', 'member'],
];

await tx(async (c) => {
  const g = (await c.query("INSERT INTO groups (name,type,location) VALUES ('Demo Chilimba','accumulating','Lusaka') RETURNING id")).rows[0];
  const pw = await bcrypt.hash('password123', 10);
  const ids = [];
  for (const [name, phone, role] of people) {
    const m = await c.query(
      'INSERT INTO members (group_id,full_name,phone_enc,phone_hash,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [g.id, name, encrypt(phone), phoneHash(phone), role === 'member' ? null : pw, role]);
    ids.push(m.rows[0].id);
  }
  const rules = validateRules({ contribution_amount: 20000 });
  const cy = (await c.query("INSERT INTO cycles (group_id,start_date,end_date,rules) VALUES ($1, CURRENT_DATE - 28, CURRENT_DATE + 180, $2) RETURNING id", [g.id, rules])).rows[0];
  for (let week = 0; week < 3; week++) {
    for (const id of ids) await addPosting(c, { cycleId: cy.id, memberId: id, type: 'contribution', amount: 20000, actorId: ids[1], groupId: g.id });
  }
});
console.log('Seeded. Officer login: +260971000002 (treasurer) / password123; chairperson +260971000001');
await pool.end();
