import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { mapUserToFrontend } from '@/lib/dbMapper';
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

    const { name, email, role, isActive } = await req.json();

    if (supabase) {
      let query = supabase.from('users').select('*').eq('id', id);
      if (decodedUser.orgId && !decodedUser.isSuperAdmin) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: targetUser, error: fetchError } = await query.maybeSingle();

      if (fetchError || !targetUser) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }

      // Prevent deactivating or demoting the last remaining System Owner
      if (targetUser.role === 'owner' && (role !== 'owner' || isActive === false)) {
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'owner')
          .eq('is_active', true);

        if (countError) {
          console.error('Supabase count owners error:', countError);
          throw countError;
        }

        if ((count || 0) <= 1) {
          return NextResponse.json({ error: 'Forbidden. The system must have at least one active System Owner.' }, { status: 400 });
        }
      }

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (email) updateData.email = email.trim().toLowerCase();
      
      if (role) {
        if (!['owner', 'sales_admin', 'sales_rep'].includes(role)) {
          return NextResponse.json({ error: 'Invalid system role.' }, { status: 400 });
        }
        updateData.role = role;
      }
      
      if (typeof isActive === 'boolean') {
        updateData.is_active = isActive;
      }

      let updateQuery = supabase.from('users').update(updateData).eq('id', id);
      if (decodedUser.orgId && !decodedUser.isSuperAdmin) {
        updateQuery = updateQuery.eq('org_id', decodedUser.orgId);
      }
      const { data: updatedUser, error: updateError } = await updateQuery.select('*').single();

      if (updateError) {
        console.error('Supabase user update error:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: `Employee account "${updatedUser.name}" successfully updated!`,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.is_active
        }
      });

    } else {
      await connectToDatabase();

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
    }
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

    if (supabase) {
      let query = supabase.from('users').select('*').eq('id', id);
      if (decodedUser.orgId && !decodedUser.isSuperAdmin) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: targetUser, error: fetchError } = await query.maybeSingle();

      if (fetchError || !targetUser) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }

      // Prevent deleting the last remaining Owner account
      if (targetUser.role === 'owner') {
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'owner');

        if (countError) {
          console.error('Supabase count owners for delete error:', countError);
          throw countError;
        }

        if ((count || 0) <= 1) {
          return NextResponse.json({ error: 'Forbidden. The system must have at least one System Owner.' }, { status: 400 });
        }
      }

      let deleteQuery = supabase.from('users').delete().eq('id', id);
      if (decodedUser.orgId && !decodedUser.isSuperAdmin) {
        deleteQuery = deleteQuery.eq('org_id', decodedUser.orgId);
      }
      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('Supabase user delete error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: `Employee account "${targetUser.name}" permanently deleted.`
      });

    } else {
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
    }
  } catch (error) {
    console.error('Delete user API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
