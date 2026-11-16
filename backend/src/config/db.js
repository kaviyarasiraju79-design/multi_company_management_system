import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const baseConfig = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  max: 5,
};

export const MASTER_DB = process.env.MASTER_DB || 'mcms_master';

// Pool for the master (routing) database
export const masterPool = new Pool({ ...baseConfig, database: MASTER_DB });

// One pool per company database, created lazily and cached by company id
const companyPools = new Map();

/**
 * Returns the connection pool for a company's own database.
 * The database name is looked up in the master DB, so adding a 6th company
 * only needs a new row in `companies` plus its database.
 */
export async function getCompanyPool(companyId) {
  if (companyPools.has(companyId)) return companyPools.get(companyId);

  const { rows } = await masterPool.query(
    'SELECT db_name FROM companies WHERE id = $1',
    [companyId]
  );
  if (rows.length === 0) {
    const err = new Error('Company not found');
    err.status = 404;
    throw err;
  }

  const pool = new Pool({ ...baseConfig, database: rows[0].db_name });
  companyPools.set(companyId, pool);
  return pool;
}

export async function closeAllPools() {
  await Promise.all([...companyPools.values()].map((p) => p.end()));
  await masterPool.end();
}
