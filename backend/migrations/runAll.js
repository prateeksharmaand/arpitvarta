const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');
require('dotenv').config();

// Every *.sql file in this folder runs once, in filename order, and is
// recorded in _migrations. Add new changes as a new numbered file.
const migrations = fs.readdirSync(__dirname).filter(f => f.endsWith('.sql')).sort();

async function runAll() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        run_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const file of migrations) {
      const already = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (already.rows.length) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }

      console.log(`Running ${file}...`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`  ✓ ${file}`);
    }

    console.log('All migrations completed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runAll();
