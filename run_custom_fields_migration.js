/**
 * Migration: Create custom_field_definitions table
 * Run this ONCE in your Supabase SQL Editor:
 * 
 * Copy everything inside the SQL block below and paste into:
 * Supabase Dashboard → SQL Editor → New Query → Run
 */

const SQL = `
-- ──────────────────────────────────────────────────────────────────
-- custom_field_definitions
-- Stores owner-defined custom field schemas per module per org
-- ──────────────────────────────────────────────────────────────────
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

-- Ensure no duplicate field keys per org+module
CREATE UNIQUE INDEX IF NOT EXISTS uq_custom_field_org_module_key
  ON public.custom_field_definitions (org_id, module, field_key);

-- Index for fast per-org lookups
CREATE INDEX IF NOT EXISTS idx_custom_fields_org_module
  ON public.custom_field_definitions (org_id, module);

-- RLS: Only authenticated users can read their own org's fields
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────
-- Add sector column to organizations (if not already present)
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT '';

-- ──────────────────────────────────────────────────────────────────
-- Add custom_data JSONB column to leads table (if not present)
-- This stores all custom field values: { "vehicle_type": "SUV", ... }
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ──────────────────────────────────────────────────────────────────
-- Add hidden_standard_fields column to organizations (if not present)
-- This stores toggled-off standard field keys e.g., ["source", "annualRevenue"]
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS hidden_standard_fields JSONB NOT NULL DEFAULT '[]'::jsonb;
`;

console.log('='.repeat(70));
console.log('CUSTOM FIELDS MIGRATION SQL');
console.log('='.repeat(70));
console.log('\nCopy the SQL below and run it in your Supabase SQL Editor:\n');
console.log(SQL);
console.log('='.repeat(70));
console.log('\nAfter running the SQL:');
console.log('1. The custom_field_definitions table will be created');
console.log('2. organizations table will have a "sector" column');
console.log('3. leads table will have a "custom_data" JSONB column');
