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
  console.log(`\n1. Starting E2E Forgot/Reset Password flow test for email: ${testEmail}`);
  
  try {
    const appUrl = 'http://localhost:5000';
    console.log(`Triggering forgot-password API at: ${appUrl}`);
    
    // Call forgot password API
    const forgotRes = await fetch(`${appUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const forgotData = await forgotRes.json();
    if (!forgotRes.ok) {
      console.error('❌ Forgot password API failed:', forgotData);
      return;
    }

    console.log('🎉 Forgot password API succeeded! Response:', forgotData);

    // Retrieve generated OTP from Supabase to verify it was stored correctly
    console.log('Retrieving generated OTP from Supabase users table...');
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('otp_code, otp_expiry')
      .eq('email', testEmail)
      .single();

    if (fetchError || !user) {
      console.error('❌ Failed to fetch user OTP properties:', fetchError);
      return;
    }

    const retrievedOtp = user.otp_code;
    console.log(`✅ Retrieved OTP from Supabase: ${retrievedOtp}, Expiry: ${user.otp_expiry}`);

    // Call reset password API
    console.log('\n2. Triggering reset-password API with retrieved OTP...');
    const newPassword = 'vaibhavpassword123';
    
    const resetRes = await fetch(`${appUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otpCode: retrievedOtp,
        newPassword: newPassword
      })
    });

    const resetData = await resetRes.json();
    if (!resetRes.ok) {
      console.error('❌ Reset password API failed:', resetData);
      return;
    }

    console.log('🎉 Reset password API succeeded! Response:', resetData);

    // Verify OTP was cleared in the DB
    const { data: userAfter, error: fetchError2 } = await supabase
      .from('users')
      .select('otp_code, otp_expiry, password')
      .eq('email', testEmail)
      .single();

    if (fetchError2) {
      console.error('❌ Fetch after failed:', fetchError2);
    } else {
      console.log(`✅ Verification: otp_code in database is now: ${userAfter.otp_code} (Should be null)`);
      console.log(`✅ Verification: otp_expiry is: ${userAfter.otp_expiry} (Should be null)`);
      console.log(`✅ Verification: password hash updated: ${userAfter.password.substring(0, 15)}...`);
    }

  } catch (err) {
    console.error('❌ E2E Integration Test Error:', err);
  }
}

runTest();
