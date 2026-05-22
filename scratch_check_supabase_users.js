const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  try {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users from Supabase:', error.message);
      return;
    }
    console.log(`Total users in Supabase: ${users ? users.length : 0}`);
    if (users) {
      users.forEach((u, i) => {
        console.log(`User #${i + 1}: Name="${u.name}", Email="${u.email}", Role="${u.role}", ApprovalStatus="${u.approval_status}", IsActive=${u.is_active}`);
      });
    }
  } catch (err) {
    console.error('Err:', err);
  }
}

checkUsers();
