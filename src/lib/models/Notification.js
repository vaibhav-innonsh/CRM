import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient user reference is required'],
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['Task', 'Call', 'Meeting', 'Lead', 'Invoice', 'System'],
      default: 'System',
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message description is required'],
      trim: true,
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for fast queries of unread notifications by user
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
