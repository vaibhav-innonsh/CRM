import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST /api/auth/register - Self-signup endpoint for Sales Executives (requires Manager approval)
export async function POST(req) {
  try {
    await connectToDatabase();

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required fields.' }, { status: 400 });
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address syntax.' }, { status: 400 });
    }

    if (!['sales_rep', 'sales_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden. Invalid system role signup request.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Security password must be at least 6 characters long.' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'An employee account with this email is already registered.' }, { status: 400 });
    }

    // Securely hash password using bcrypt helper
    const hashedPassword = await hashPassword(password);

    // Create user with explicit Pending and inactive states
    const newUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role, // Assigning dynamic requested role
      approvalStatus: 'Pending',
      isActive: false // Deactivated until manager/owner approval
    });

    return NextResponse.json({
      success: true,
      message: 'Registration requested successfully! Your account is pending manager approval.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        approvalStatus: newUser.approvalStatus
      }
    });
  } catch (error) {
    console.error('Self registration API error:', error);
    return NextResponse.json({ error: 'Internal server error during registration.' }, { status: 500 });
  }
}
