/**
 * run_healthcare_leads_migration.js
 * ----------------------------
 * Migration runner to create the healthcare_leads table in Supabase PostgreSQL.
 * Run using: node run_healthcare_leads_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
-- Create healthcare_leads table
CREATE TABLE IF NOT EXISTS public.healthcare_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id_custom TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT DEFAULT '',
    mobile TEXT NOT NULL,
    email TEXT DEFAULT '',
    source TEXT DEFAULT 'Website',
    interested_service TEXT DEFAULT '',
    symptoms TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'New', -- New, Contacted, Qualified, Converted, Lost
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_healthcare_lead_custom_id UNIQUE (org_id, lead_id_custom)
);
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(50));

  try {
    console.log('🏗️  Creating healthcare_leads table...');
    await client.query(SQL);
    console.log('✅ healthcare_leads table is ready!');
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
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_leads' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_leads');
    res.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));
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
