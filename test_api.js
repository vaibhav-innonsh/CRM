const { Client } = require('pg');

async function checkRLSTables() {
  const client = new Client({
    connectionString: "postgresql://postgres:Multitent100@db.vqpifsasrfevhsfskqhl.supabase.co:5432/postgres"
  });

  try {
    await client.connect();
    console.log("Connected successfully.");

    const res = await client.query(`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND rowsecurity = true;
    `);
    console.log("\n--- TABLES WITH RLS ENABLED ---");
    console.log(res.rows);

    const policies = await client.query(`
      SELECT schemaname, tablename, policyname, cmd 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `);
    console.log("\n--- ALL POLICIES ---");
    console.log(policies.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkRLSTables();
