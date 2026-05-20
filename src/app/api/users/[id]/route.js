import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/users/[id] - Update employee profile metadata and system role
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STRICT SECURITY GATE: Only System Owners can modify active directory members
    if (decodedUser.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden. Only System Owners can modify employee profiles.' }, { status: 403 });
    }

    await connectToDatabase();

    const { name, email, role, isActive } = await req.json();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
    }

    // Prevent deactivating or demoting the last remaining System Owner
    if (targetUser.role === 'owner' && (role !== 'owner' || isActive === false)) {
      const activeOwnersCount = await User.countDocuments({ role: 'owner', isActive: true });
      if (activeOwnersCount <= 1) {
        return NextResponse.json({ error: 'Forbidden. The system must have at least one active System Owner.' }, { status: 400 });
      }
    }

    // Update metadata properties dynamically
    if (name) targetUser.name = name.trim();
    if (email) targetUser.email = email.trim().toLowerCase();
    
    if (role) {
      if (!['owner', 'sales_admin', 'sales_rep'].includes(role)) {
        return NextResponse.json({ error: 'Invalid system role.' }, { status: 400 });
      }
      targetUser.role = role;
    }
    
    if (typeof isActive === 'boolean') {
      targetUser.isActive = isActive;
    }

    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: `Employee account "${targetUser.name}" successfully updated!`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive
      }
    });
  } catch (error) {
    console.error('Update user API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Permanently revoke employee access and delete profile
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STRICT SECURITY GATE: Only System Owners can permanently delete employee accounts
    if (decodedUser.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden. Only System Owners can revoke access profiles.' }, { status: 403 });
    }

    await connectToDatabase();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
    }

    // Prevent deleting the last remaining Owner account
    if (targetUser.role === 'owner') {
      const ownersCount = await User.countDocuments({ role: 'owner' });
      if (ownersCount <= 1) {
        return NextResponse.json({ error: 'Forbidden. The system must have at least one System Owner.' }, { status: 400 });
      }
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Employee account "${targetUser.name}" permanently deleted.`
    });
  } catch (error) {
    console.error('Delete user API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
