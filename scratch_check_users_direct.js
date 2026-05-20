const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Vaibhav_Thorat:Mongodb100@cluster0.0lfintn.mongodb.net/?appName=Cluster0';

async function checkDatabaseUsers() {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected! Fetching collections...');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Active collections:', collections.map(c => c.name));

    // Get all users
    console.log('\n--- FETCHING ALL DOCUMENTS IN THE "users" COLLECTION ---');
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    
    console.log(`Total users found: ${users.length}`);
    users.forEach((u, i) => {
      console.log(`\nUser #${i + 1}:`);
      console.log(`- ID: ${u._id}`);
      console.log(`- Name: ${u.name}`);
      console.log(`- Email: "${u.email}" (Length: ${u.email?.length})`);
      console.log(`- Role: ${u.role}`);
      console.log(`- Has Password Hash: ${!!u.password}`);
      if (u.password) {
        console.log(`  - Hash Start: ${u.password.substring(0, 10)}...`);
      }
    });

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

checkDatabaseUsers();
