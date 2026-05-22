import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { mapUserToFrontend } from '@/lib/dbMapper';
import { comparePassword, signToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let user = null;
    let userId = null;
    let userName = null;
    let userEmail = null;
    let userRole = null;
    let userApprovalStatus = 'Approved';
    let userIsActive = true;
    let userHashedPassword = '';

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      // Query Supabase PostgreSQL
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        console.error('Supabase user fetch error:', error);
      } else if (data) {
        user = mapUserToFrontend(data);
        userId = data.id;
        userName = data.name;
        userEmail = data.email;
        userRole = data.role;
        userApprovalStatus = data.approval_status;
        userIsActive = data.is_active;
        userHashedPassword = data.password;
      }
    } else {
      // Graceful fallback to MongoDB
      await connectToDatabase();
      const mongoUser = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (mongoUser) {
        user = mongoUser;
        userId = mongoUser._id;
        userName = mongoUser.name;
        userEmail = mongoUser.email;
        userRole = mongoUser.role;
        userApprovalStatus = mongoUser.approvalStatus;
        userIsActive = mongoUser.isActive;
        userHashedPassword = mongoUser.password;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check approval moderation status
    if (userApprovalStatus === 'Pending') {
      return NextResponse.json(
        { error: '🔒 Your account registration is pending manager approval. Please check back later.' },
        { status: 403 }
      );
    }

    if (!userIsActive) {
      return NextResponse.json(
        { error: 'User account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // 2. Compare password hashes
    const isMatch = await comparePassword(password, userHashedPassword);

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3. Create session token (JWT)
    const sessionToken = signToken({
      id: userId,
      name: userName,
      email: userEmail,
      role: userRole,
    });

    // 4. Create response and set cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole,
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
