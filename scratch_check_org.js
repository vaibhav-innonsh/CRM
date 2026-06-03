const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres"
  });

  await client.connect();
  console.log("Connected to PostgreSQL database successfully.");

  try {
    const res = await client.query("SELECT id, name, enabled_modules FROM organizations;");
    console.log("\n--- ORGANIZATIONS AND ENABLED MODULES ---");
    res.rows.forEach(org => {
      console.log(`Org ID: ${org.id}`);
      console.log(`Name: ${org.name}`);
      console.log(`Enabled Modules:`, org.enabled_modules);
      console.log("-".repeat(40));
    });
  } catch (err) {
    console.error("Error querying organizations:", err.message);
  }

  await client.end();
}

main().catch(err => console.error(err));
