const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Vaibhav_Thorat:Mongodb100@cluster0.0lfintn.mongodb.net/?appName=Cluster0';

async function discover() {
  console.log('Connecting to Atlas Cluster...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const admin = mongoose.connection.db.admin();
    const dbsList = await admin.listDatabases();
    
    console.log('\n--- DATABASES FOUND IN CLUSTER ---');
    for (const dbInfo of dbsList.databases) {
      console.log(`- Database Name: ${dbInfo.name} (${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      
      // Connect to each database to list collections
      const conn = mongoose.connection.useDb(dbInfo.name);
      const collections = await conn.db.listCollections().toArray();
      console.log(`  Collections: [${collections.map(c => c.name).join(', ')}]`);
    }

  } catch (err) {
    console.error('Discovery failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

discover();
