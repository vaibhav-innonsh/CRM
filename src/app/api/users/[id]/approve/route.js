import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { NextResponse } from 'next/server';

// PUT /api/users/[id]/approve - Handle Manager Approval Actions (Approve or Reject request)
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY GATES: Only Owners and Sales Managers can approve accounts
    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json({ error: 'Forbidden. Access restricted to Sales Managers or Owner.' }, { status: 403 });
    }

    const { action } = await req.json();

    if (!action || !['Approve', 'Reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid approval action. Must be Approve or Reject.' }, { status: 400 });
    }

    if (supabase) {
      const { data: targetUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !targetUser) {
        return NextResponse.json({ error: 'Representative request not found.' }, { status: 404 });
      }

      // STRICT HIERARCHY GATE: Sales Managers strictly can ONLY manage Sales Executive (sales_rep) accounts
      if (decodedUser.role === 'sales_admin' && targetUser.role !== 'sales_rep') {
        return NextResponse.json({ error: 'Forbidden. Sales Managers can strictly only manage Sales Representative accounts.' }, { status: 403 });
      }

      if (action === 'Approve') {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            approval_status: 'Approved',
            is_active: true
          })
          .eq('id', id);

        if (updateError) {
          console.error('Supabase user approval update error:', updateError);
          throw updateError;
        }

        // Send automated dynamic welcoming system notification
        try {
          await createNotification(
            targetUser.id,
            'System',
            '🤝 Welcome to Innonsh CRM!',
            'Your representative credentials are fully approved and active! Start managing your sales leads now.',
            '/dashboard',
            decodedUser.id
          );
        } catch (noticeErr) {
          console.error('Failed to dispatch welcome notification alert:', noticeErr);
        }

        return NextResponse.json({
          success: true,
          message: `Account for "${targetUser.name}" successfully approved and active!`
        });
      }

      if (action === 'Reject') {
        // Clean delete rejected users from registry so they can re-register if needed
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Supabase user delete rejection error:', deleteError);
          throw deleteError;
        }

        return NextResponse.json({
          success: true,
          message: 'Account request declined and purged successfully.'
        });
      }

    } else {
      await connectToDatabase();

      const targetUser = await User.findById(id);

      if (!targetUser) {
        return NextResponse.json({ error: 'Representative request not found.' }, { status: 404 });
      }

      // STRICT HIERARCHY GATE: Sales Managers strictly can ONLY manage Sales Executive (sales_rep) accounts
      if (decodedUser.role === 'sales_admin' && targetUser.role !== 'sales_rep') {
        return NextResponse.json({ error: 'Forbidden. Sales Managers can strictly only manage Sales Representative accounts.' }, { status: 403 });
      }

      if (action === 'Approve') {
        targetUser.approvalStatus = 'Approved';
        targetUser.isActive = true;
        await targetUser.save();

        // Send automated dynamic welcoming system notification
        try {
          await createNotification(
            targetUser._id,
            'System',
            '🤝 Welcome to Innonsh CRM!',
            'Your representative credentials are fully approved and active! Start managing your sales leads now.',
            '/dashboard',
            decodedUser.id
          );
        } catch (noticeErr) {
          console.error('Failed to dispatch welcome notification alert:', noticeErr);
        }

        return NextResponse.json({
          success: true,
          message: `Account for "${targetUser.name}" successfully approved and active!`
        });
      }

      if (action === 'Reject') {
        // Clean delete rejected users from registry so they can re-register if needed
        await User.findByIdAndDelete(id);

        return NextResponse.json({
          success: true,
          message: 'Account request declined and purged successfully.'
        });
      }
    }
  } catch (error) {
    console.error('User approval action api error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
