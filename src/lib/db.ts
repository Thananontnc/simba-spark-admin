import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  max: 1,
});

const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const query = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
  const { rows } = await pool.query(query, values as unknown[]);
  return rows;
};

export default sql;
