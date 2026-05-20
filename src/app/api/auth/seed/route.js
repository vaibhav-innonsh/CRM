import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Check if any owner already exists to prevent duplicate seeding
    const existingOwner = await User.findOne({ role: 'owner' });

    if (existingOwner) {
      return NextResponse.json(
        { error: 'System is already initialized. Owner account already exists.' },
        { status: 400 }
      );
    }

    // 2. Create the initial Owner (Super Admin) account
    const defaultEmail = 'owner@mycompany.com';
    const defaultPassword = 'ownerpassword123'; // Users must change this immediately
    const hashedPassword = await hashPassword(defaultPassword);

    const firstOwner = await User.create({
      name: 'Company Owner',
      email: defaultEmail,
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    });

    return NextResponse.json({
      message: 'System successfully initialized! Owner account created.',
      details: {
        id: firstOwner._id,
        name: firstOwner.name,
        email: firstOwner.email,
        role: firstOwner.role,
        default_credentials: {
          email: defaultEmail,
          password: defaultPassword,
          note: 'Please change your password immediately after logging in for security.'
        }
      }
    });
  } catch (error) {
    console.error('Seeding Error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database.', details: error.message },
      { status: 500 }
    );
  }
}
