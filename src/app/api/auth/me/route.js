import { getUserFromRequest, comparePassword, hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { mapUserToFrontend } from '@/lib/dbMapper';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // 1. Get decoded user from token
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. No active session found.' },
        { status: 401 }
      );
    }

    let user = null;
    let userId = null;
    let userName = null;
    let userEmail = null;
    let userRole = null;
    let userIsActive = true;

    // 2. FRESH FETCH FROM DB
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decodedUser.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase get-me fetch error:', error);
      } else if (data) {
        user = mapUserToFrontend(data);
        userId = data.id;
        userName = data.name;
        userEmail = data.email;
        userRole = data.role;
        userIsActive = data.is_active;
      }
    } else {
      await connectToDatabase();
      const mongoUser = await User.findById(decodedUser.id);
      if (mongoUser) {
        user = mongoUser;
        userId = mongoUser._id;
        userName = mongoUser.name;
        userEmail = mongoUser.email;
        userRole = mongoUser.role;
        userIsActive = mongoUser.isActive;
      }
    }

    if (!user || !userIsActive) {
      return NextResponse.json(
        { error: 'User not found or deactivated.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole,
      },
    });
  } catch (error) {
    console.error('Check-session error:', error);
    return NextResponse.json(
      { error: 'Internal server error while verifying session.' },
      { status: 500 }
    );
  }
}

// PUT /api/auth/me - Update profile settings & secure password change
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user = null;
    let userId = null;
    let userName = null;
    let userEmail = null;
    let userRole = null;
    let userIsActive = true;
    let userHashedPassword = '';

    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decodedUser.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase fetch-me-put error:', error);
      } else if (data) {
        user = data;
        userId = data.id;
        userName = data.name;
        userEmail = data.email;
        userRole = data.role;
        userIsActive = data.is_active;
        userHashedPassword = data.password;
      }
    } else {
      await connectToDatabase();
      const mongoUser = await User.findById(decodedUser.id).select('+password');
      if (mongoUser) {
        user = mongoUser;
        userId = mongoUser._id;
        userName = mongoUser.name;
        userEmail = mongoUser.email;
        userRole = mongoUser.role;
        userIsActive = mongoUser.isActive;
        userHashedPassword = mongoUser.password;
      }
    }

    if (!user || !userIsActive) {
      return NextResponse.json({ error: 'User session not found or deactivated.' }, { status: 403 });
    }

    const { name, currentPassword, newPassword } = await req.json();

    let updatedName = userName;
    let updatedPassword = userHashedPassword;

    // 1. Update Name
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Profile name cannot be left blank.' }, { status: 400 });
      }
      updatedName = name.trim();
    }

    // 2. Securely Change Password using Bcrypt verification
    if (currentPassword && newPassword) {
      const isMatch = await comparePassword(currentPassword, userHashedPassword);
      if (!isMatch) {
        return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
      }

      updatedPassword = await hashPassword(newPassword);
    }

    // Save Updates
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: updatedName,
          password: updatedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        console.error('Supabase user profile update error:', error);
        throw error;
      }

      userName = data.name;
    } else {
      user.name = updatedName;
      user.password = updatedPassword;
      await user.save();
      userName = user.name;
    }

    return NextResponse.json({
      success: true,
      message: 'Profile settings updated successfully!',
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole
      }
    });
  } catch (error) {
    console.error('Update profile settings API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
