/**
 * run_records_migration.js
 * -------------------------
 * Migration runner to create healthcare_medical_records and healthcare_prescriptions tables in Supabase PostgreSQL.
 * Run using: node run_records_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
-- 1. Create healthcare_medical_records table
CREATE TABLE IF NOT EXISTS public.healthcare_medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    record_number TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.healthcare_patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.healthcare_doctors(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    symptoms TEXT DEFAULT '',
    treatment_plan TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_record_number UNIQUE (org_id, record_number)
);

-- 2. Create healthcare_prescriptions table
CREATE TABLE IF NOT EXISTS public.healthcare_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    prescription_number TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.healthcare_patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.healthcare_doctors(id) ON DELETE CASCADE,
    record_id UUID REFERENCES public.healthcare_medical_records(id) ON DELETE SET NULL,
    prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
    instructions TEXT DEFAULT '',
    medicine_details JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of objects: { name, dosage, frequency, duration }
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_prescription_number UNIQUE (org_id, prescription_number)
);

-- Enable indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_records_org ON public.healthcare_medical_records (org_id);
CREATE INDEX IF NOT EXISTS idx_records_patient ON public.healthcare_medical_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_org ON public.healthcare_prescriptions (org_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.healthcare_prescriptions (patient_id);
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(50));

  try {
    console.log('🏗&nbsp; Creating public.healthcare_medical_records & healthcare_prescriptions tables...');
    await client.query(SQL);
    console.log('✅ healthcare_medical_records and healthcare_prescriptions tables are ready!');
  } catch (err) {
    console.error('❌ Migration failed!');
    console.error(`   Error [${err.code}]: ${err.message}`);
    process.exit(1);
  }

  // Verification Check
  console.log('='.repeat(50));
  console.log('🔍 Verifying table columns...\n');
  try {
    // Records
    const resRec = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_medical_records' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_medical_records');
    resRec.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));
    console.log();

    // Prescriptions
    const resPres = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_prescriptions' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_prescriptions');
    resPres.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));

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
