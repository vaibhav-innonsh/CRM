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

async function runTest() {
  const testEmail = 'thoratvaibhav368@gmail.com';
  console.log(`\nStarting Forgot Password API endpoint test for: ${testEmail}`);
  
  try {
    const ports = ['5000', '3000'];
    let success = false;
    
    for (const port of ports) {
      const appUrl = `http://localhost:${port}`;
      console.log(`Targeting local CRM API server at: ${appUrl}`);
      try {
        const res = await fetch(`${appUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail })
        });

        const data = await res.json();
        if (res.ok) {
          console.log(`🎉 Forgot password API call on port ${port} returned 200 OK! Response:`, data);
          success = true;
          break;
        } else {
          console.warn(`⚠️ Forgot password API failed on port ${port}. Response:`, data);
        }
      } catch (e) {
        console.warn(`⚠️ Connection failed on port ${port}:`, e.message);
      }
    }

    if (!success) {
      console.error('❌ Could not connect or complete forgot-password on any port.');
      return;
    }

    // Verify DB was populated with OTP and expiry
    const { data: user, error } = await supabase
      .from('users')
      .select('otp_code, otp_expiry')
      .eq('email', testEmail)
      .single();

    if (error) {
      console.error('❌ Failed to fetch user from DB:', error);
    } else {
      console.log(`✅ Verification: otp_code in database is successfully set to: ${user.otp_code}`);
      console.log(`✅ Verification: otp_expiry is: ${user.otp_expiry}`);
    }

  } catch (err) {
    console.error('❌ Forgot Password API Test Error:', err);
  }
}

runTest();
