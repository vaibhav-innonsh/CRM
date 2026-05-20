const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://Vaibhav_Thorat:Mongodb100@cluster0.0lfintn.mongodb.net/?appName=Cluster0';

async function testPasswordMatching() {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected! Fetching Manager and Rep...');

    const users = await mongoose.connection.db.collection('users').find({
      email: { $in: ['manager@mycompany.com', 'rep@mycompany.com'] }
    }).toArray();

    for (const u of users) {
      console.log(`\nTesting User: ${u.email} (${u.role})`);
      const testPass = u.email.startsWith('manager') ? 'managerpassword123' : 'reppassword123';
      
      console.log(`- Password to test: "${testPass}"`);
      console.log(`- Saved Hash in DB: "${u.password}"`);
      
      const isMatch = await bcrypt.compare(testPass, u.password);
      console.log(`- Match Result using bcryptjs: ${isMatch ? '✅ MATCHED!' : '❌ FAILED!'}`);
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

testPasswordMatching();
