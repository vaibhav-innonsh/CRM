/**
 * run_db_migration.js
 * -------------------
 * Directly runs all required migrations against Supabase PostgreSQL.
 * Run with: node run_db_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const MIGRATIONS = [
  {
    name: 'Add sector column to organizations',
    sql: `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT '';`,
  },
  {
    name: 'Add hidden_standard_fields column to organizations',
    sql: `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS hidden_standard_fields JSONB NOT NULL DEFAULT '[]'::jsonb;`,
  },
  {
    name: 'Add custom_data column to leads',
    sql: `ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;`,
  },
  {
    name: 'Add custom_data column to contacts',
    sql: `ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;`,
  },
  {
    name: 'Add custom_data column to deals',
    sql: `ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;`,
  },
  {
    name: 'Create custom_field_definitions table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        module       TEXT NOT NULL DEFAULT 'leads',
        field_key    TEXT NOT NULL,
        field_label  TEXT NOT NULL,
        field_type   TEXT NOT NULL DEFAULT 'text',
        options      JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_required  BOOLEAN NOT NULL DEFAULT false,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },
  {
    name: 'Create unique index on custom_field_definitions (org_id, module, field_key)',
    sql: `
      CREATE UNIQUE INDEX IF NOT EXISTS uq_custom_field_org_module_key
        ON public.custom_field_definitions (org_id, module, field_key);
    `,
  },
  {
    name: 'Create index on custom_field_definitions for fast lookups',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_custom_fields_org_module
        ON public.custom_field_definitions (org_id, module);
    `,
  },
  {
    name: 'Enable RLS on custom_field_definitions',
    sql: `ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;`,
  },
];

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const migration of MIGRATIONS) {
    try {
      await client.query(migration.sql);
      console.log(`✅ ${migration.name}`);
      passed++;
    } catch (err) {
      // Ignore "already exists" type errors gracefully
      if (err.code === '42701' || err.code === '42P07' || err.code === '42710') {
        console.log(`⚠️  ${migration.name} — Already exists (skipped)`);
        passed++;
      } else {
        console.error(`❌ ${migration.name}`);
        console.error(`   Error [${err.code}]: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\nColumns now available:');
    console.log('  • organizations.sector');
    console.log('  • organizations.hidden_standard_fields (JSONB)');
    console.log('  • leads.custom_data (JSONB)');
    console.log('  • contacts.custom_data (JSONB)');
    console.log('  • deals.custom_data (JSONB)');
    console.log('  • Table: custom_field_definitions');
  } else {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
  }

  // Verify the current state
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Verifying table structure...\n');

  const tablesToCheck = ['organizations', 'leads', 'contacts', 'deals'];
  for (const table of tablesToCheck) {
    const res = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position`,
      [table]
    );
    const cols = res.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log(`📋 Table: ${table}`);
    cols.forEach(c => console.log(`     - ${c}`));
    console.log();
  }

  // Check if custom_field_definitions exists
  const tableCheck = await client.query(
    `SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'custom_field_definitions') AS exists`
  );
  console.log(`📋 Table: custom_field_definitions — ${tableCheck.rows[0].exists ? '✅ EXISTS' : '❌ MISSING'}`);

  await client.end();
  console.log('\n✅ Done!\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
