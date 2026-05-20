const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://Vaibhav_Thorat:Mongodb100@cluster0.0lfintn.mongodb.net/?appName=Cluster0';

async function seedRoles() {
  console.log('Connecting to MongoDB Atlas...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected!');

    const UserSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true },
      role: { type: String, default: 'sales_rep' },
      isActive: { type: Boolean, default: true }
    }, { collection: 'users', timestamps: true });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // 1. Create Sales Manager Account
    const managerEmail = 'manager@mycompany.com';
    const existingManager = await User.findOne({ email: managerEmail });
    if (!existingManager) {
      console.log('Creating Sales Manager user...');
      const hashedPassword = await bcrypt.hash('managerpassword123', 10);
      await User.create({
        name: 'Innonsh Sales Manager',
        email: managerEmail,
        password: hashedPassword,
        role: 'sales_admin',
        isActive: true
      });
      console.log('🎉 Sales Manager created: manager@mycompany.com / managerpassword123');
    } else {
      console.log('Sales Manager user already exists.');
    }

    // 2. Create Sales Representative Account
    const repEmail = 'rep@mycompany.com';
    const existingRep = await User.findOne({ email: repEmail });
    if (!existingRep) {
      console.log('Creating Sales Representative user...');
      const hashedPassword = await bcrypt.hash('reppassword123', 10);
      await User.create({
        name: 'Innonsh Sales Rep',
        email: repEmail,
        password: hashedPassword,
        role: 'sales_rep',
        isActive: true
      });
      console.log('🎉 Sales Rep created: rep@mycompany.com / reppassword123');
    } else {
      console.log('Sales Representative user already exists.');
    }

    console.log('All roles seeded successfully!');

  } catch (err) {
    console.error('❌ SEEDING ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

seedRoles();
