import { getUserFromRequest, comparePassword, hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';

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

    await connectToDatabase();

    // 2. Fetch fresh user data from database (ensuring active status)
    const user = await User.findById(decodedUser.id);

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or deactivated.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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

    await connectToDatabase();

    const user = await User.findById(decodedUser.id).select('+password');

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User session not found or deactivated.' }, { status: 403 });
    }

    const { name, currentPassword, newPassword } = await req.json();

    // 1. Update Name
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Profile name cannot be left blank.' }, { status: 400 });
      }
      user.name = name.trim();
    }

    // 2. Securely Change Password using Bcrypt verification
    if (currentPassword && newPassword) {
      const isMatch = await comparePassword(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
      }

      user.password = await hashPassword(newPassword);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile settings updated successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile settings API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
