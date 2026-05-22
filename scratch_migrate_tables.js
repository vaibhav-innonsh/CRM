const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually to get DATABASE_URL
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is missing in .env.local!');
  process.exit(1);
}

console.log('Connecting to PostgreSQL database using DATABASE_URL...');

const client = new Client({
  connectionString: connectionString,
});

const sql = `
-- 1. Enable UUID extension if not exists
create extension if not exists "uuid-ossp";

-- 2. CALLS TABLE
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  call_type text not null check (call_type in ('Inbound', 'Outbound')) default 'Outbound',
  call_duration integer default 0,
  call_result text not null check (call_result in ('Answered', 'No Answer', 'Busy', 'Voicemail')) default 'Answered',
  call_time timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text default '',
  assigned_to uuid references users(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. MEETINGS TABLE
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  location_type text not null check (location_type in ('Online', 'Offline')) default 'Online',
  location_detail text default '',
  agenda text default '',
  status text not null check (status in ('Scheduled', 'Completed', 'Cancelled')) default 'Scheduled',
  assigned_to uuid references users(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. PRODUCTS TABLE
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique not null,
  price numeric not null check (price >= 0),
  category text default 'Software',
  description text default '',
  status text not null check (status in ('Active', 'Inactive')) default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. QUOTATIONS TABLE
create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  quote_number text unique not null,
  title text not null,
  contact_id uuid references contacts(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  quote_date timestamp with time zone default timezone('utc'::text, now()) not null,
  valid_until timestamp with time zone not null,
  line_items jsonb default '[]'::jsonb,
  subtotal numeric not null check (subtotal >= 0) default 0,
  tax_rate numeric not null default 18,
  tax_amount numeric not null check (tax_amount >= 0) default 0,
  grand_total numeric not null check (grand_total >= 0) default 0,
  notes text default '',
  status text not null check (status in ('Draft', 'Sent', 'Accepted', 'Rejected')) default 'Draft',
  assigned_to uuid references users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. INVOICES TABLE
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  title text not null,
  quotation_id uuid references quotations(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  invoice_date timestamp with time zone default timezone('utc'::text, now()) not null,
  due_date timestamp with time zone not null,
  line_items jsonb default '[]'::jsonb,
  subtotal numeric not null check (subtotal >= 0) default 0,
  tax_rate numeric not null default 18,
  tax_amount numeric not null check (tax_amount >= 0) default 0,
  grand_total numeric not null check (grand_total >= 0) default 0,
  amount_paid numeric not null check (amount_paid >= 0) default 0,
  balance_due numeric not null default 0,
  status text not null check (status in ('Unpaid', 'Partially Paid', 'Paid', 'Overdue')) default 'Unpaid',
  payments jsonb default '[]'::jsonb,
  notes text default '',
  assigned_to uuid references users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. TEAMS TABLE
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text default '',
  leader uuid references users(id) on delete set null,
  members jsonb default '[]'::jsonb,
  region text default 'General',
  target_amount numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. EMAILS TABLE
create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  lead_id uuid references leads(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  sent_by uuid references users(id) on delete set null,
  opens_count integer default 0,
  opened_at jsonb default '[]'::jsonb,
  downloads_count integer default 0,
  downloaded_at jsonb default '[]'::jsonb,
  replied boolean default false,
  replied_at timestamp with time zone default null,
  reply_body text default '',
  proposal_file text default '',
  proposal_file_data text default '',
  proposal_file_mime_type text default '',
  channel text not null check (channel in ('email', 'whatsapp', 'both')) default 'email',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Create indexes for quick search
create index if not exists calls_lead_id_idx on calls(lead_id);
create index if not exists calls_contact_id_idx on calls(contact_id);
create index if not exists meetings_lead_id_idx on meetings(lead_id);
create index if not exists meetings_contact_id_idx on meetings(contact_id);
create index if not exists quotations_lead_id_idx on quotations(lead_id);
create index if not exists invoices_lead_id_idx on invoices(lead_id);
create index if not exists emails_lead_id_idx on emails(lead_id);
create index if not exists emails_contact_id_idx on emails(contact_id);
`;

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database!');
    console.log('Running SQL commands to create missing tables...');
    await client.query(sql);
    console.log('🎉 SCHEMA MIGRATION COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
