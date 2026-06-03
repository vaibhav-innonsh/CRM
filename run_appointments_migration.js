/**
 * run_appointments_migration.js
 * ------------------------------
 * Migration runner to create healthcare_appointments table in Supabase PostgreSQL.
 * Run using: node run_appointments_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
CREATE TABLE IF NOT EXISTS public.healthcare_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    appointment_number TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.healthcare_patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.healthcare_doctors(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled, Confirmed, Completed, Cancelled, No Show
    reason_for_visit TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_appointment_number UNIQUE (org_id, appointment_number)
);

-- Enable indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.healthcare_appointments (org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.healthcare_appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.healthcare_appointments (doctor_id);
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(50));

  try {
    console.log('🏗️  Creating public.healthcare_appointments table...');
    await client.query(SQL);
    console.log('✅ public.healthcare_appointments table is ready!');
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
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_appointments' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_appointments');
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
