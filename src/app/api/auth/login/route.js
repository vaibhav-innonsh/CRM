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
    let userIsSuperAdmin = false;
    let userOrgApprovalStatus = 'Approved';
    let userCompanyName = '';
    let userOrgId = null;
    let userEnabledModules = ['leads', 'deals', 'contacts', 'tasks', 'emails', 'calls', 'meetings', 'products', 'quotations', 'invoices', 'reports', 'analytics', 'users', 'roles', 'teams', 'real-estate'];

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
        userIsSuperAdmin = data.is_super_admin || data.role === 'superadmin';
        userOrgId = data.org_id;

        // Check organization approval status if not a super admin
        if (data.org_id && !data.is_super_admin) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('name, approval_status, enabled_modules')
            .eq('id', data.org_id)
            .maybeSingle();
          if (orgError) {
            console.error('Supabase organization fetch error:', orgError);
          } else if (orgData) {
            userOrgApprovalStatus = orgData.approval_status;
            userCompanyName = orgData.name;
            userEnabledModules = orgData.enabled_modules || [];
          }
        }
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
        userIsSuperAdmin = mongoUser.isSuperAdmin || mongoUser.role === 'superadmin';
        userOrgId = mongoUser.orgId || mongoUser.org_id || null;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check organization approval status
    if (userOrgApprovalStatus === 'Pending') {
      return NextResponse.json(
        { error: '🔒 Your company registration is currently pending Super Admin approval. Please check back later.' },
        { status: 403 }
      );
    }

    if (userOrgApprovalStatus === 'Suspended') {
      return NextResponse.json(
        { error: '❌ Your company access has been suspended. Please contact support.' },
        { status: 403 }
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
    if (userIsSuperAdmin && !userEnabledModules.includes('real-estate')) {
      userEnabledModules.push('real-estate');
    }
    const sessionToken = signToken({
      id: userId,
      name: userName,
      email: userEmail,
      role: userRole,
      isSuperAdmin: userIsSuperAdmin,
      orgId: userOrgId,
      enabledModules: userEnabledModules,
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
        companyName: userCompanyName,
        isSuperAdmin: userIsSuperAdmin,
        orgId: userOrgId,
        enabledModules: userEnabledModules,
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
