/**
 * run_gaps_migration.js
 * ----------------------
 * Migration to fix scenario gaps:
 * 1. Add `result` column to healthcare_lab_tests
 * 2. Add `line_items` JSONB column to healthcare_billing
 * Run: node run_gaps_migration.js
 */

const { Client } = require('pg');
const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
ALTER TABLE public.healthcare_lab_tests
  ADD COLUMN IF NOT EXISTS result TEXT DEFAULT '';

ALTER TABLE public.healthcare_billing
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });
  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected!');
  console.log('='.repeat(50));

  try {
    console.log('🏗️  Applying gap fixes migration...');
    await client.query(SQL);
    console.log('✅ All column additions successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('🔍 Verifying columns...\n');

  const labCols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_lab_tests' AND table_schema = 'public' ORDER BY ordinal_position`
  );
  console.log('📋 healthcare_lab_tests:');
  labCols.rows.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));

  console.log();
  const billCols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_billing' AND table_schema = 'public' ORDER BY ordinal_position`
  );
  console.log('📋 healthcare_billing:');
  billCols.rows.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));

  await client.end();
  console.log('\n🎉 Done!\n');
}

main().catch(err => {
  console.error('💥 Fatal:', err.message);
  process.exit(1);
});
