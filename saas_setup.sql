-- ==========================================
-- SAAS PLATFORM ISOLATED DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. SAAS ORGANIZATIONS TABLE
-- This stores the different companies that register on the platform.
CREATE TABLE IF NOT EXISTS public.saas_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL DEFAULT 'SOFTWARE_SERVICES',
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Suspended
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow SuperAdmin to view all, and org users to view their own.
-- For now, we keep it simple: policies will be managed in application code or defined later for strict isolation.

-- 2. SAAS USERS TABLE
-- This stores the users belonging to the SaaS platform.
CREATE TABLE IF NOT EXISTS public.saas_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.saas_organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'org_agent', -- superadmin, org_admin, org_manager, org_agent
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INSERT THE DEFAULT INNONSH SUPER ADMIN
-- We will create a dummy 'Innonsh Platform' organization and link a Super Admin to it.
-- You can log in with this account to approve new companies.
INSERT INTO public.saas_organizations (id, name, industry, status)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'Innonsh Platform', 
    'SOFTWARE_SERVICES', 
    'Approved'
) ON CONFLICT DO NOTHING;

-- Note: The password below is hashed. For a real environment, you should register via the API to hash correctly, 
-- but we will provide an API route to seed the Super Admin with a password you choose.

-- Optional: Create basic updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach triggers
DROP TRIGGER IF EXISTS update_saas_org_modtime ON public.saas_organizations;
CREATE TRIGGER update_saas_org_modtime
    BEFORE UPDATE ON public.saas_organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_saas_user_modtime ON public.saas_users;
CREATE TRIGGER update_saas_user_modtime
    BEFORE UPDATE ON public.saas_users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
