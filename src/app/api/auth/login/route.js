import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { comparePassword, signToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 1. Find user by email and explicitly select password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check approval moderation status
    if (user.approvalStatus === 'Pending') {
      return NextResponse.json(
        { error: '🔒 Your account registration is pending manager approval. Please check back later.' },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // 2. Compare password hashes
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3. Create session token (JWT)
    const sessionToken = signToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // 4. Create response and set cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Save token as HTTP-Only cookie, valid for 7 days
    response.cookies.set({
      name: 'token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login.' },
      { status: 500 }
    );
  }
}
