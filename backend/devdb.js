// Dev-only: runs a local Postgres inside the project (data in ../.pgdata). Works on Windows, macOS and Linux.
// For production use a managed Postgres or `docker compose up -d`.
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../.pgdata', import.meta.url));
const fresh = !fs.existsSync(dir);
const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'groupsave', password: 'groupsave', port: 5432, persistent: true });
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase('groupsave');
console.log('Postgres ready on 5432');
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await pg.stop(); process.exit(0); });
