import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const query = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
  const { rows } = await pool.query(query, values as unknown[]);
  return rows;
};

export default sql;
