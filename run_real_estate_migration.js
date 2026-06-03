/**
 * run_real_estate_migration.js
 * ----------------------------
 * Migration runner to create real_estate_properties table in Supabase PostgreSQL.
 * Run using: node run_real_estate_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
CREATE TABLE IF NOT EXISTS public.real_estate_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Apartment',
    location TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    size NUMERIC NOT NULL DEFAULT 0,
    beds INTEGER NOT NULL DEFAULT 0,
    baths INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Available',
    image TEXT DEFAULT '',
    amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS if needed, for now we will disable or create direct SELECT/INSERT policies
-- ALTER TABLE public.real_estate_properties ENABLE ROW LEVEL SECURITY;
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(50));

  try {
    console.log('🏗️  Creating public.real_estate_properties table...');
    await client.query(SQL);
    console.log('✅ public.real_estate_properties table is ready!');
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
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'real_estate_properties' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    const cols = res.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log('📋 Table: real_estate_properties');
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
