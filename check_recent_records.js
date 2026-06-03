const { Client } = require('pg');

async function checkRecentRecords() {
  const client = new Client({
    connectionString: "postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres"
  });

  try {
    await client.connect();
    console.log("Connected successfully.");

    const leads = await client.query("SELECT id, first_name, last_name, company, status, org_id FROM leads ORDER BY created_at DESC LIMIT 5;");
    console.log("\n--- LATEST LEADS ---");
    console.log(leads.rows);

    const contacts = await client.query("SELECT id, first_name, last_name, company, lead_id, org_id FROM contacts ORDER BY created_at DESC LIMIT 5;");
    console.log("\n--- LATEST CONTACTS ---");
    console.log(contacts.rows);

    const deals = await client.query("SELECT id, title, value, stage, lead_id, org_id FROM deals ORDER BY created_at DESC LIMIT 5;");
    console.log("\n--- LATEST DEALS ---");
    console.log(deals.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkRecentRecords();
