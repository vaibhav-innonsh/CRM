/**
 * run_site_visits_migration.js
 * ----------------------------
 * Migration runner to create real_estate_site_visits table in Supabase PostgreSQL.
 * Run using: node run_site_visits_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
CREATE TABLE IF NOT EXISTS public.real_estate_site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
    visit_date TIMESTAMPTZ NOT NULL,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    feedback TEXT DEFAULT '',
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
    console.log('🏗️  Creating public.real_estate_site_visits table...');
    await client.query(SQL);
    console.log('✅ public.real_estate_site_visits table is ready!');
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
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'real_estate_site_visits' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    const cols = res.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log('📋 Table: real_estate_site_visits');
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
