/**
 * run_bookings_migration.js
 * -------------------------
 * Migration runner to create real_estate_bookings table in Supabase PostgreSQL.
 * Run using: node run_bookings_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
CREATE TABLE IF NOT EXISTS public.real_estate_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.real_estate_units(id) ON DELETE CASCADE,
    booking_amount NUMERIC NOT NULL DEFAULT 0,
    booking_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Confirmed', -- Pending, Confirmed, Cancelled
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(50));

  try {
    console.log('🏗️  Creating public.real_estate_bookings table...');
    await client.query(SQL);
    console.log('✅ public.real_estate_bookings table is ready!');
  } catch (err) {
    console.error('❌ Migration failed!');
    console.error(`   Error [${err.code}]: ${err.message}`);
    process.exit(1);
  }

  // Verification Check
  console.log('='.repeat(50));
  console.log('🔍 Verifying table columns...\n');
  try {
    const res = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'real_estate_bookings' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    const cols = res.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log('📋 Table: real_estate_bookings');
    cols.forEach(c => console.log(`     - ${c}`));
  } catch (err) {
    console.error('❌ Verification check failed:', err.message);
  }

  await client.end();
  console.log('\n🎉 Done!\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
