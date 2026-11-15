import pg from 'pg';
import { config } from './config.js';

pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT -> number (ngwee fit safely)
pg.types.setTypeParser(1700, (v) => Number(v)); // NUMERIC (SUM of BIGINT) -> number
pg.types.setTypeParser(1082, (v) => v); // DATE -> 'YYYY-MM-DD' string

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
export const q = (text, params) => pool.query(text, params);

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
