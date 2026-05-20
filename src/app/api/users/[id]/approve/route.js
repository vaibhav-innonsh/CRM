import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
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

    await connectToDatabase();

    const targetUser = await User.findById(id);

    if (!targetUser) {
      return NextResponse.json({ error: 'Representative request not found.' }, { status: 404 });
    }

    // STRICT HIERARCHY GATE: Sales Managers strictly can ONLY manage Sales Executive (sales_rep) accounts
    if (decodedUser.role === 'sales_admin' && targetUser.role !== 'sales_rep') {
      return NextResponse.json({ error: 'Forbidden. Sales Managers can strictly only manage Sales Representative accounts.' }, { status: 403 });
    }

    const { action } = await req.json();

    if (!action || !['Approve', 'Reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid approval action. Must be Approve or Reject.' }, { status: 400 });
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

  } catch (error) {
    console.error('User approval action api error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
