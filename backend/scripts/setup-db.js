import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '..', 'sql');

const base = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
};
const ADMIN_DB = process.env.PG_ADMIN_DB || 'postgres';
const MASTER_DB = process.env.MASTER_DB || 'mcms_master';
const RESET = process.argv.includes('--reset');

const ADMIN_PASSWORD = 'Admin@123';
const EMPLOYEE_PASSWORD = 'Employee@123';

// The 5 companies. Each gets its own database: mcms_company_<n>
const COMPANIES = [
  {
    code: 'ym',
    name: 'YM AUTOMATION Pvt Ltd',
    industry: 'Software',
    email: 'contact@ymautomation.example',
    phone: '+91 44 4000 1001',
    address: '12 Anna Salai, Chennai, Tamil Nadu',
    website: 'https://ymautomation.example',
    users: [
      { username: 'ym.admin', fullName: 'Arun Kumar', role: 'Admin' },
      { username: 'ym.priya', fullName: 'Priya Raman', role: 'Employee' },
      { username: 'ym.karthik', fullName: 'Karthik S', role: 'Employee' },
    ],
  },
  {
    code: 'steel',
    name: 'STEEL ENGINEERING PVT Ltd',
    industry: 'IRON AND STEEL',
    email: 'hello@steelengineering.example',
    phone: '+91 80 4000 2002',
    address: '45 MG Road, Bengaluru, Karnataka',
    website: 'https://steelengineering.example',
    users: [
      { username: 'steel.admin', fullName: 'Meena Iyer', role: 'Admin' },
      { username: 'steel.rahul', fullName: 'Rahul Nair', role: 'Employee' },
    ],
  },
  {
    code: 'msc',
    name: 'MSC Logistics',
    industry: 'Logistics',
    email: 'ops@msclogistics.example',
    phone: '+91 22 4000 3003',
    address: '7 Marine Drive, Mumbai, Maharashtra',
    website: 'https://msclogistics.example',
    users: [
      { username: 'msc.admin', fullName: 'Vikram Shah', role: 'Admin' },
      { username: 'msc.anita', fullName: 'Anita Desai', role: 'Employee' },
    ],
  },
  {
    code: 'omega',
    name: 'Omega Health Care',
    industry: 'Healthcare',
    email: 'care@omegahealth.example',
    phone: '+91 40 4000 4004',
    address: '88 Banjara Hills, Hyderabad, Telangana',
    website: 'https://omegahealth.example',
    users: [
      { username: 'omega.admin', fullName: 'Dr. Sana Ali', role: 'Admin' },
      { username: 'omega.joseph', fullName: 'Joseph Mathew', role: 'Employee' },
    ],
  },
  {
    code: 'sakthi',
    name: 'Sakthi Finance',
    industry: 'Financial Services',
    email: 'info@sakthifinance.example',
    phone: '+91 11 4000 5005',
    address: '3 Connaught Place, New Delhi',
    website: 'https://sakthifinance.example',
    users: [
      { username: 'sakthi.admin', fullName: 'Rohit Verma', role: 'Admin' },
      { username: 'sakthi.divya', fullName: 'Divya Menon', role: 'Employee' },
    ],
  },
];

const dbNameFor = (index) => `mcms_company_${index + 1}`;

async function withClient(database, fn) {
  const client = new pg.Client({ ...base, database });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureDatabase(admin, name) {
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (rowCount === 0) {
    // Identifiers can't be parameterised; names are fixed constants above
    await admin.query(`CREATE DATABASE "${name}"`);
    console.log(`  created database ${name}`);
  } else {
    console.log(`  database ${name} already exists`);
  }
}

async function main() {
  const allDbs = [MASTER_DB, ...COMPANIES.map((_, i) => dbNameFor(i))];

  console.log(`Connecting to ${base.host}:${base.port} as ${base.user}`);
  await withClient(ADMIN_DB, async (admin) => {
    if (RESET) {
      console.log('Reset: dropping existing MCMS databases');
      for (const name of allDbs) {
        await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
      }
    }
    console.log('Creating databases');
    for (const name of allDbs) await ensureDatabase(admin, name);
  });

  const masterSql = fs.readFileSync(path.join(sqlDir, 'master.sql'), 'utf8');
  const companySql = fs.readFileSync(path.join(sqlDir, 'company.sql'), 'utf8');

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const employeeHash = await bcrypt.hash(EMPLOYEE_PASSWORD, 10);

  await withClient(MASTER_DB, async (master) => {
    await master.query(masterSql);

    for (const [i, c] of COMPANIES.entries()) {
      const dbName = dbNameFor(i);

      const { rows } = await master.query(
        `INSERT INTO companies (code, db_name) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET db_name = EXCLUDED.db_name
         RETURNING id`,
        [c.code, dbName]
      );
      const companyId = rows[0].id;

      await withClient(dbName, async (db) => {
        await db.query(companySql);
        await db.query(
          `INSERT INTO company (id, name, industry, email, phone, address, website)
           VALUES (1, $1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [c.name, c.industry, c.email, c.phone, c.address, c.website]
        );

        for (const u of c.users) {
          const hash = u.role === 'Admin' ? adminHash : employeeHash;
          await db.query(
            `INSERT INTO users (username, password_hash, full_name, email, role)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (username) DO NOTHING`,
            [u.username, hash, u.fullName, `${u.username.split('.')[1]}@${c.code}.example`, u.role]
          );
          await master.query(
            `INSERT INTO user_directory (username, company_id) VALUES ($1, $2)
             ON CONFLICT (username) DO NOTHING`,
            [u.username, companyId]
          );
        }
      });

      console.log(`  seeded ${c.name} -> ${dbName}`);
    }
  });

  console.log('\nDone. Sample logins:');
  for (const c of COMPANIES) {
    for (const u of c.users) {
      const pw = u.role === 'Admin' ? ADMIN_PASSWORD : EMPLOYEE_PASSWORD;
      console.log(`  ${c.name.padEnd(26)} ${u.role.padEnd(9)} ${u.username.padEnd(16)} ${pw}`);
    }
  }
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
});