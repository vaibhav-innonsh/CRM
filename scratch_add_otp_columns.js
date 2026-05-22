const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

const client = new Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database!');
    console.log('Adding otp_code and otp_expiry columns to users table...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMPTZ;
    `);
    console.log('🎉 DB schema successfully updated!');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await client.end();
  }
}

run();
