/**
 * run_finance_migration.js
 * ----------------------------
 * Migration runner to create healthcare_billing, healthcare_claims, and healthcare_pharmacy tables in Supabase PostgreSQL.
 * Run using: node run_finance_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
-- 1. Create healthcare_billing table
CREATE TABLE IF NOT EXISTS public.healthcare_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.healthcare_patients(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    final_amount NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Partially Paid, Paid
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_invoice_number UNIQUE (org_id, invoice_number)
);

-- 2. Create healthcare_claims table
CREATE TABLE IF NOT EXISTS public.healthcare_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    claim_number TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.healthcare_patients(id) ON DELETE CASCADE,
    insurance_provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    claim_amount NUMERIC NOT NULL DEFAULT 0,
    approved_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Submitted', -- Submitted, Under Review, Approved, Rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_claim_number UNIQUE (org_id, claim_number)
);

-- 3. Create healthcare_pharmacy table
CREATE TABLE IF NOT EXISTS public.healthcare_pharmacy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    category TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    supplier TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pharmacy_medicine_batch UNIQUE (org_id, medicine_name, batch_number)
);

-- Enable indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_billing_org ON public.healthcare_billing (org_id);
CREATE INDEX IF NOT EXISTS idx_billing_patient ON public.healthcare_billing (patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_org ON public.healthcare_claims (org_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON public.healthcare_claims (patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_org ON public.healthcare_pharmacy (org_id);
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(50));

  try {
    console.log('🏗️  Creating public.healthcare_billing, healthcare_claims, & healthcare_pharmacy tables...');
    await client.query(SQL);
    console.log('✅ Tables created and indexes established successfully!');
  } catch (err) {
    console.error('❌ Migration failed!');
    console.error(`   Error [${err.code}]: ${err.message}`);
    process.exit(1);
  }

  // Verification Check
  console.log('='.repeat(50));
  console.log('🔍 Verifying table columns...\n');
  try {
    // Billing
    const resBill = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_billing' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_billing');
    resBill.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));
    console.log();

    // Claims
    const resClaim = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_claims' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_claims');
    resClaim.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));
    console.log();

    // Pharmacy
    const resPharm = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'healthcare_pharmacy' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('📋 Table: healthcare_pharmacy');
    resPharm.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));

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
