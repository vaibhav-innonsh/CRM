import connectToDatabase from '@/lib/db';
import Notification from '@/lib/models/Notification';

/**
 * Utility helper to issue dynamic user notification inside CRM databases
 * @param {string} recipientId - MongoDB ObjectId of user recipient
 * @param {'Task'|'Call'|'Meeting'|'Lead'|'Invoice'|'System'} type - Category type of notice
 * @param {string} title - Compact notice summary heading
 * @param {string} message - Descriptive notification details
 * @param {string} link - Relative redirect dashboard endpoint path
 * @param {string|null} senderId - ObjectId of user triggering this action (optional)
 */
export async function createNotification(recipientId, type, title, message, link = '', senderId = null) {
  try {
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
  } catch (error) {
    console.error('Failed to issue database notification document:', error);
    return null;
  }
}
