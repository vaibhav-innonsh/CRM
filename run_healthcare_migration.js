/**
 * run_healthcare_migration.js
 * ----------------------------
 * Migration runner to create healthcare_doctors and healthcare_patients tables
 * and seed the healthcare sector terminology config in Supabase PostgreSQL.
 * Run using: node run_healthcare_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
-- 1. Create healthcare_doctors table
CREATE TABLE IF NOT EXISTS public.healthcare_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    doctor_id_custom TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    department TEXT NOT NULL,
    email TEXT DEFAULT '',
    mobile TEXT DEFAULT '',
    qualification TEXT DEFAULT '',
    experience TEXT DEFAULT '',
    consultation_fee NUMERIC NOT NULL DEFAULT 0,
    availability JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_doctor_custom_id UNIQUE (org_id, doctor_id_custom)
);

-- 2. Create healthcare_patients table
CREATE TABLE IF NOT EXISTS public.healthcare_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    patient_id_custom TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT DEFAULT '',
    gender TEXT NOT NULL,
    dob DATE NOT NULL,
    blood_group TEXT NOT NULL,
    address TEXT DEFAULT '',
    emergency_contact TEXT DEFAULT '',
    insurance_provider TEXT DEFAULT '',
    insurance_number TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_patient_custom_id UNIQUE (org_id, patient_id_custom)
);

-- 3. Seed terminology config in saas_sectors_config
INSERT INTO public.saas_sectors_config (id, name, lead_term, product_term, deal_term, pipeline_stages)
VALUES (
  'healthcare',
  'Healthcare & Clinic Management',
  'Patient Prospect',
  'Treatment / Lab Test',
  'Consultation Opportunity',
  '["Inquiry Received", "Triage / Symptoms Logged", "Doctor OPD Booked", "Consultation Done", "Treatment Active", "Billing & Claims", "Discharged & Follow-up"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  lead_term = EXCLUDED.lead_term,
  product_term = EXCLUDED.product_term,
  deal_term = EXCLUDED.deal_term,
  pipeline_stages = EXCLUDED.pipeline_stages;
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(50));

  try {
    console.log('🏗️  Creating healthcare tables & seeding configurations...');
    await client.query(SQL);
    console.log('✅ healthcare_doctors and healthcare_patients tables are ready!');
    console.log('✅ saas_sectors_config terminology for healthcare seeded successfully!');
  } catch (err) {
    console.error('❌ Migration failed!');
    console.error(`   Error [${err.code}]: ${err.message}`);
    process.exit(1);
  }

  // Verification Check
  console.log('='.repeat(50));
  console.log('🔍 Verifying table columns...\n');
  try {
    // Doctors Table columns
    const resDoctors = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_doctors' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_doctors');
    resDoctors.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));
    console.log();

    // Patients Table columns
    const resPatients = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_patients' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_patients');
    resPatients.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));
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
