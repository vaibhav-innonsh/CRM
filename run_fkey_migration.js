/**
 * run_fkey_migration.js
 * -------------------
 * Adds missing foreign key constraints to leads, contacts, deals, lead_notes, and lead_attachments tables.
 * Includes a pre-migration cleanup step to ensure no orphaned records block the constraint creation.
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres';

const CLEANUPS = [
  // 1. Clean up leads orphans
  {
    name: 'Clean up leads.assigned_to orphans',
    sql: `UPDATE public.leads SET assigned_to = NULL WHERE assigned_to IS NOT NULL AND assigned_to NOT IN (SELECT id FROM public.users);`
  },
  {
    name: 'Clean up leads.org_id orphans',
    sql: `DELETE FROM public.leads WHERE org_id IS NOT NULL AND org_id NOT IN (SELECT id FROM public.organizations);`
  },
  // 2. Clean up contacts orphans
  {
    name: 'Clean up contacts.assigned_to orphans',
    sql: `UPDATE public.contacts SET assigned_to = NULL WHERE assigned_to IS NOT NULL AND assigned_to NOT IN (SELECT id FROM public.users);`
  },
  {
    name: 'Clean up contacts.org_id orphans',
    sql: `DELETE FROM public.contacts WHERE org_id IS NOT NULL AND org_id NOT IN (SELECT id FROM public.organizations);`
  },
  // 3. Clean up deals orphans
  {
    name: 'Clean up deals.assigned_to orphans',
    sql: `UPDATE public.deals SET assigned_to = NULL WHERE assigned_to IS NOT NULL AND assigned_to NOT IN (SELECT id FROM public.users);`
  },
  {
    name: 'Clean up deals.org_id orphans',
    sql: `DELETE FROM public.deals WHERE org_id IS NOT NULL AND org_id NOT IN (SELECT id FROM public.organizations);`
  },
  // 4. Clean up lead_notes orphans
  {
    name: 'Clean up lead_notes.lead_id orphans',
    sql: `DELETE FROM public.lead_notes WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM public.leads);`
  },
  {
    name: 'Clean up lead_notes.created_by orphans',
    sql: `UPDATE public.lead_notes SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM public.users);`
  },
  // 5. Clean up lead_attachments orphans
  {
    name: 'Clean up lead_attachments.lead_id orphans',
    sql: `DELETE FROM public.lead_attachments WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM public.leads);`
  }
];

const CONSTRAINTS = [
  // 1. Leads Table
  {
    name: 'Add fk_leads_assigned_to to leads',
    sql: `ALTER TABLE public.leads ADD CONSTRAINT fk_leads_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;`
  },
  {
    name: 'Add fk_leads_org_id to leads',
    sql: `ALTER TABLE public.leads ADD CONSTRAINT fk_leads_org_id FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`
  },
  // 2. Contacts Table
  {
    name: 'Add fk_contacts_assigned_to to contacts',
    sql: `ALTER TABLE public.contacts ADD CONSTRAINT fk_contacts_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;`
  },
  {
    name: 'Add fk_contacts_org_id to contacts',
    sql: `ALTER TABLE public.contacts ADD CONSTRAINT fk_contacts_org_id FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`
  },
  {
    name: 'Add fk_contacts_lead_id to contacts',
    sql: `ALTER TABLE public.contacts ADD CONSTRAINT fk_contacts_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;`
  },
  // 3. Deals Table
  {
    name: 'Add fk_deals_assigned_to to deals',
    sql: `ALTER TABLE public.deals ADD CONSTRAINT fk_deals_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;`
  },
  {
    name: 'Add fk_deals_org_id to deals',
    sql: `ALTER TABLE public.deals ADD CONSTRAINT fk_deals_org_id FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`
  },
  {
    name: 'Add fk_deals_lead_id to deals',
    sql: `ALTER TABLE public.deals ADD CONSTRAINT fk_deals_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;`
  },
  // 4. Lead Notes Table
  {
    name: 'Add fk_lead_notes_lead_id to lead_notes',
    sql: `ALTER TABLE public.lead_notes ADD CONSTRAINT fk_lead_notes_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;`
  },
  {
    name: 'Add fk_lead_notes_created_by to lead_notes',
    sql: `ALTER TABLE public.lead_notes ADD CONSTRAINT fk_lead_notes_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;`
  },
  // 5. Lead Attachments Table
  {
    name: 'Add fk_lead_attachments_lead_id to lead_attachments',
    sql: `ALTER TABLE public.lead_attachments ADD CONSTRAINT fk_lead_attachments_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;`
  }
];

async function main() {
  const client = new Client({ connectionString: DB_URL });

  console.log('\n🔌 Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected successfully!\n');
  
  console.log('🧹 PART 1: Performing Pre-migration Cleanup (Orphan check)...');
  console.log('='.repeat(60));
  for (const cleanup of CLEANUPS) {
    try {
      const res = await client.query(cleanup.sql);
      console.log(`✅ ${cleanup.name} (Rows affected: ${res.rowCount || 0})`);
    } catch (err) {
      console.error(`❌ Cleanup Failed: ${cleanup.name}`);
      console.error(`   Error [${err.code}]: ${err.message}`);
    }
  }

  console.log('\n🛠️ PART 2: Adding Foreign Key Constraints...');
  console.log('='.repeat(60));
  let passed = 0;
  let failed = 0;

  for (const constraint of CONSTRAINTS) {
    try {
      await client.query(constraint.sql);
      console.log(`✅ ${constraint.name}`);
      passed++;
    } catch (err) {
      // Ignore "already exists" type errors gracefully
      if (err.code === '42710') {
        console.log(`⚠️  ${constraint.name} — Already exists (skipped)`);
        passed++;
      } else {
        console.error(`❌ ${constraint.name}`);
        console.error(`   Error [${err.code}]: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 All foreign key constraints added successfully!');
    console.log('PostgREST schema cache is now fully relational and ready for joins!');
  } else {
    console.log('\n⚠️ Some migrations failed. Check errors above.');
  }

  await client.end();
  console.log('\n✅ Done!\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
