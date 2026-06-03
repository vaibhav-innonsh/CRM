/**
 * run_support_tickets_migration.js
 * ----------------------------
 * Migration runner to create support_tickets and ticket_comments tables in Supabase PostgreSQL.
 * Run using: node run_support_tickets_migration.js
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const SQL = `
-- 1. Create Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    ticket_type TEXT NOT NULL, -- 'Bug Report', 'Change Request', 'Feature Request', 'Login Issue', 'Hosting Issue'
    priority TEXT NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    status TEXT NOT NULL DEFAULT 'New', -- 'New', 'In Progress', 'Pending Client', 'Resolved', 'Closed'
    
    -- Multi-tenant isolation & relations
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Sub-schemas
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    resolved_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for high-performance sorting & lookup
CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON public.support_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to);

-- 2. Create Ticket Comments Table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false, -- Private dev discussion not shown to client
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);
`;

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!');
  console.log('='.repeat(60));

  try {
    console.log('🏗️  Creating support_tickets and ticket_comments tables...');
    await client.query(SQL);
    console.log('✅ Tables created successfully!');
  } catch (err) {
    console.error('❌ Migration failed!');
    console.error(`   Error [${err.code}]: ${err.message}`);
    process.exit(1);
  }

  // Verification Check
  console.log('='.repeat(60));
  console.log('🔍 Verifying tables in database...\n');
  try {
    const ticketColsRes = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'support_tickets' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    const ticketCols = ticketColsRes.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log('📋 Table: support_tickets');
    ticketCols.forEach(c => console.log(`     - ${c}`));

    console.log('\n' + '='.repeat(30));

    const commentColsRes = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ticket_comments' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    const commentCols = commentColsRes.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log('📋 Table: ticket_comments');
    commentCols.forEach(c => console.log(`     - ${c}`));

  } catch (err) {
    console.error('❌ Verification check failed:', err.message);
  }

  await client.end();
  console.log('\n🎉 Migration completed successfully!\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error during migration:', err.message);
  process.exit(1);
});
