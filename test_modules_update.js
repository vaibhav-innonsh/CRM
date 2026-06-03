const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres"
  });

  await client.connect();
  console.log("Connected to PostgreSQL successfully.");

  const innonshOrgId = '281371fe-5ee4-4e3a-b9cf-8e584c088104';
  const updatedModules = [
    'leads', 'deals', 'contacts', 'tasks', 'emails', 'calls',
    'meetings', 'products', 'quotations', 'invoices', 'reports',
    'analytics', 'users', 'roles', 'teams'
  ]; // Excludes 'real-estate'

  try {
    console.log("Updating enabled_modules in database...");
    const res = await client.query(
      "UPDATE organizations SET enabled_modules = $1, updated_at = now() WHERE id = $2 RETURNING id, name, enabled_modules;",
      [updatedModules, innonshOrgId]
    );
    console.log("Update Success! Returned row:");
    console.log(res.rows[0]);
  } catch (err) {
    console.error("SQL Update Error:", err.message);
  }

  await client.end();
}

main().catch(err => console.error(err));
