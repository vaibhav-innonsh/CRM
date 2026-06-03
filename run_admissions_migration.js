/**
 * run_admissions_migration.js
 * ----------------------------
 * Migration runner to create healthcare_lab_tests and healthcare_admissions tables in Supabase PostgreSQL.
 * Run using: node run_admissions_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
-- 1. Create healthcare_lab_tests table
CREATE TABLE IF NOT EXISTS public.healthcare_lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    test_number TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.healthcare_patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.healthcare_doctors(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL,
    lab_technician TEXT DEFAULT '',
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, In Progress, Completed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_test_number UNIQUE (org_id, test_number)
);

-- 2. Create healthcare_admissions table
CREATE TABLE IF NOT EXISTS public.healthcare_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    admission_number TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.healthcare_patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.healthcare_doctors(id) ON DELETE CASCADE,
    room TEXT NOT NULL,
    bed TEXT NOT NULL,
    admission_date TIMESTAMPTZ NOT NULL,
    discharge_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Admitted', -- Admitted, Discharged, Transferred
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_admission_number UNIQUE (org_id, admission_number)
);

-- Enable indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_lab_tests_org ON public.healthcare_lab_tests (org_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient ON public.healthcare_lab_tests (patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_org ON public.healthcare_admissions (org_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON public.healthcare_admissions (patient_id);
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(50));

  try {
    console.log('🏗️  Creating public.healthcare_lab_tests & healthcare_admissions tables...');
    await client.query(SQL);
    console.log('✅ healthcare_lab_tests and healthcare_admissions tables are ready!');
  } catch (err) {
    console.error('❌ Migration failed!');
    console.error(`   Error [${err.code}]: ${err.message}`);
    process.exit(1);
  }

  // Verification Check
  console.log('='.repeat(50));
  console.log('🔍 Verifying table columns...\n');
  try {
    // Lab Tests
    const resLab = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_lab_tests' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_lab_tests');
    resLab.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));
    console.log();

    // Admissions
    const resAdm = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_admissions' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_admissions');
    resAdm.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));

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
