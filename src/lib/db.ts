import { Pool } from 'pg';

// Strip sslmode from the URL — the `ssl` option below controls SSL, and pg v8
// logs a security warning whenever sslmode=require appears in the string.
const connectionString = process.env.DATABASE_URL
  ?.replace(/([?&])sslmode=[^&]*&?/, '$1')
  .replace(/[?&]$/, '');

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
  // Recycle idle connections before Neon closes them server-side (~5 min),
  // otherwise queries hang forever on a dead socket.
  idleTimeoutMillis: 30_000,
  // Neon free tier suspends compute; cold start can take 5–15s.
  connectionTimeoutMillis: 30_000,
  keepAlive: true,
});

// Fail fast instead of hanging if a connection dies mid-query.
pool.on('error', () => { /* dead idle connection removed from pool */ });

const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const query = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
  const { rows } = await pool.query(query, values as unknown[]);
  return rows;
};

type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export async function withTransaction<T>(fn: (sql: SqlFn) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txSql: SqlFn = async (strings, ...values) => {
      const query = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
      const { rows } = await client.query(query, values as unknown[]);
      return rows;
    };
    const result = await fn(txSql);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export default sql;
