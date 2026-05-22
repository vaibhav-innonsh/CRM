import connectToDatabase from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { supabase } from '@/lib/supabaseClient';
import { mapNotificationToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/notifications - Retrieve latest notices & unread counts
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    let notifications = [];
    let unreadCount = 0;

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      // Query Supabase
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', decodedUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Supabase fetch notifications error:', error);
        throw error;
      }

      notifications = (data || []).map(mapNotificationToFrontend);

      // Count unread
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', decodedUser.id)
        .eq('is_read', false);

      if (countError) {
        console.error('Supabase count notifications error:', countError);
        throw countError;
      }

      unreadCount = count || 0;

    } else {
      // Fallback to MongoDB
      await connectToDatabase();

      const mongoNotifications = await Notification.find({ recipientId: decodedUser.id })
        .sort({ createdAt: -1 })
        .limit(10);

      notifications = mongoNotifications;

      unreadCount = await Notification.countDocuments({
        recipientId: decodedUser.id,
        isRead: false
      });
    }

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

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('recipient_id', decodedUser.id)
        .eq('is_read', false);

      if (error) {
        console.error('Supabase update notifications error:', error);
        throw error;
      }
    } else {
      // Fallback to MongoDB
      await connectToDatabase();

      await Notification.updateMany(
        { recipientId: decodedUser.id, isRead: false },
        { $set: { isRead: true } }
      );
    }

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
