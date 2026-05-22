const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Parse .env.local manually
const envPath = path.join(__dirname, '.env.local');
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

const host = env.SMTP_HOST;
const port = parseInt(env.SMTP_PORT || '587', 10);
const secure = env.SMTP_SECURE === 'true';
const user = env.SMTP_USER;
const pass = env.SMTP_PASS;
const fromEmail = env.SMTP_FROM_EMAIL || user;

console.log('--- SMTP SETTINGS ---');
console.log('Host:', host);
console.log('Port:', port);
console.log('Secure:', secure);
console.log('User:', user);
console.log('Password length:', pass ? pass.length : 0);
console.log('From Email:', fromEmail);

if (!host || !user || !pass) {
  console.error('❌ Missing host, user or password in .env.local!');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function testSMTP() {
  try {
    console.log('\nVerifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP Connection verified successfully!');

    console.log('\nAttempting to send a test email to', user, '...');
    const info = await transporter.sendMail({
      from: fromEmail,
      to: user,
      subject: 'Innonsh CRM SMTP Test Email',
      text: 'This is a test email sent from the CRM workspace to verify SMTP connectivity and credentials.',
      html: '<p>This is a <b>test email</b> sent from the CRM workspace to verify SMTP connectivity and credentials.</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('❌ SMTP Dispatch Error:', error);
  }
}

testSMTP();
