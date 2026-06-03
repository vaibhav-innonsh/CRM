/**
 * run_documents_possessions_migration.js
 * -----------------------------------------
 * Migration runner to create real_estate_documents and real_estate_possessions tables in Supabase PostgreSQL.
 * Run using: node run_documents_possessions_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
CREATE TABLE IF NOT EXISTS public.real_estate_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL, -- Agreement, NOC, KYC, Tax Invoice
    file_url TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.real_estate_possessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.real_estate_units(id) ON DELETE CASCADE,
    handover_date DATE,
    keys_handed_over BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled, Handed Over, Delayed
    remarks TEXT DEFAULT '',
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
    console.log('🏗️  Creating public.real_estate_documents & possessions tables...');
    await client.query(SQL);
    console.log('✅ public.real_estate_documents & public.real_estate_possessions tables are ready!');
  } catch (err) {
    console.error('❌ Migration failed!');
    console.error(`   Error [${err.code}]: ${err.message}`);
    process.exit(1);
  }

  // Verification Check
  console.log('='.repeat(50));
  console.log('🔍 Verifying table columns...\n');
  try {
    const resDocs = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'real_estate_documents' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    const colsDocs = resDocs.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log('📋 Table: real_estate_documents');
    colsDocs.forEach(c => console.log(`     - ${c}`));

    console.log('\n' + '='.repeat(30) + '\n');

    const resPoss = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'real_estate_possessions' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    const colsPoss = resPoss.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log('📋 Table: real_estate_possessions');
    colsPoss.forEach(c => console.log(`     - ${c}`));
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
