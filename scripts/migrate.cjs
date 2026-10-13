const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files in ${migrationsDir}`);

  const dbUrl = process.env.DATABASE_URL;
  const clientConfig = dbUrl
    ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: { rejectUnauthorized: false }
      };

  if (!dbUrl && (!clientConfig.host || !clientConfig.password)) {
    throw new Error('Database credentials missing: Please configure DATABASE_URL or PGHOST/PGPASSWORD in environment variables.');
  }

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.\n');

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Running migration: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✓ Migration ${file} applied successfully.\n`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Error executing ${file}:`, err.message);
        throw err;
      }
    }

    console.log('🎉 All migrations applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
