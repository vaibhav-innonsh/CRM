import mongoose from 'mongoose';

const CallSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Call subject is required'],
      trim: true,
    },
    callType: {
      type: String,
      enum: ['Inbound', 'Outbound'],
      default: 'Outbound',
    },
    callDuration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    callResult: {
      type: String,
      enum: ['Answered', 'No Answer', 'Busy', 'Voicemail'],
      default: 'Answered',
    },
    callTime: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // attribution & relationships
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Call log owner is required'],
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Call || mongoose.model('Call', CallSchema);
