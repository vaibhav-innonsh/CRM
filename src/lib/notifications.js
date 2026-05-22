import connectToDatabase from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { supabase } from '@/lib/supabaseClient';

/**
 * Utility helper to issue dynamic user notification inside CRM databases
 * @param {string} recipientId - Database ID of user recipient
 * @param {'Task'|'Call'|'Meeting'|'Lead'|'Invoice'|'System'} type - Category type of notice
 * @param {string} title - Compact notice summary heading
 * @param {string} message - Descriptive notification details
 * @param {string} link - Relative redirect dashboard endpoint path
 * @param {string|null} senderId - ID of user triggering this action (optional)
 */
export async function createNotification(recipientId, type, title, message, link = '', senderId = null) {
  try {
    if (supabase) {
      const noticeData = {
        recipient_id: recipientId,
        sender_id: senderId,
        type,
        title: title.trim(),
        message: message.trim(),
        link: link.trim(),
        is_read: false
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert([noticeData])
        .select('*')
        .single();

      if (error) {
        console.error('Supabase create notification error:', error);
        throw error;
      }

      return data;
    } else {
      await connectToDatabase();

      const notice = await Notification.create({
        recipientId,
        senderId,
        type,
        title: title.trim(),
        message: message.trim(),
        link: link.trim(),
        isRead: false
      });

      return notice;
    }
  } catch (error) {
    console.error('Failed to issue database notification document:', error);
    return null;
  }
}
