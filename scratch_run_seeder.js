const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://Vaibhav_Thorat:Mongodb100@cluster0.0lfintn.mongodb.net/?appName=Cluster0';

async function runSeeder() {
  console.log('Connecting to MongoDB Atlas...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected!');

    // Define User Schema matching our CRM structure
    const UserSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true },
      role: { type: String, default: 'sales_rep' },
      isActive: { type: Boolean, default: true }
    }, { collection: 'users', timestamps: true });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // 1. Check if owner@mycompany.com already exists
    const existingCrmUser = await User.findOne({ email: 'owner@mycompany.com' });
    if (existingCrmUser) {
      console.log('CRM Owner account "owner@mycompany.com" already exists!');
      return;
    }

    // 2. Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash('ownerpassword123', 10);

    // 3. Create the user
    console.log('Creating CRM Owner user...');
    const newUser = await User.create({
      name: 'Innonsh Owner',
      email: 'owner@mycompany.com',
      password: hashedPassword,
      role: 'owner',
      isActive: true
    });

    console.log('🎉 SUCCESS! CRM Owner user created successfully.');
    console.log('User ID:', newUser._id);
    console.log('Email: owner@mycompany.com');
    console.log('Password: ownerpassword123');

  } catch (err) {
    console.error('❌ SEEDER ERROR:', err.message);
    if (err.code === 11000) {
      console.error('Duplicate key error. A user with this email already exists in the shared database.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

runSeeder();
