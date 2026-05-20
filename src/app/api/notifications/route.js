import connectToDatabase from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/notifications - Retrieve latest notices & unread counts
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const notifications = await Notification.find({ recipientId: decodedUser.id })
      .sort({ createdAt: -1 })
      .limit(10); // Fetch latest 10 notifications for the dropdown popup

    const unreadCount = await Notification.countDocuments({
      recipientId: decodedUser.id,
      isRead: false
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Fetch user notifications API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching alerts.' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Mark all notifications as read in bulk
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    await Notification.updateMany(
      { recipientId: decodedUser.id, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    console.error('Mark bulk notifications read error:', error);
    return NextResponse.json(
      { error: 'Internal server error updating alerts.' },
      { status: 500 }
    );
  }
}
