const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Vaibhav_Thorat:Mongodb100@cluster0.0lfintn.mongodb.net/?appName=Cluster0';

async function listUsers() {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const UserSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String,
      isActive: Boolean,
      approvalStatus: String
    }, { collection: 'users' });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const users = await User.find({});
    console.log('\n--- ACTIVE USER DIRECTORY RECORDS ---');
    users.forEach((u, i) => {
      console.log(`${i + 1}. Name: ${u.name}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   IsActive: ${u.isActive}`);
      console.log(`   ApprovalStatus: ${u.approvalStatus || 'Approved (Direct)'}`);
      console.log('------------------------------------');
    });

  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

listUsers();
