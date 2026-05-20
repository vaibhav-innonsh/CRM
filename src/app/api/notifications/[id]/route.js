import connectToDatabase from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// PUT /api/notifications/[id] - Mark single notification as read
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const notice = await Notification.findById(id);

    if (!notice) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }

    // Verify recipient bounds
    if (notice.recipientId.toString() !== decodedUser.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this notification.' }, { status: 403 });
    }

    notice.isRead = true;
    await notice.save();

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read.',
      notification: notice
    });
  } catch (error) {
    console.error('Update single notice error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Delete notification document
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const notice = await Notification.findById(id);

    if (!notice) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }

    // Verify recipient bounds
    if (notice.recipientId.toString() !== decodedUser.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await Notification.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully.'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
