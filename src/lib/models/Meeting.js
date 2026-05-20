import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start date and time are required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End date and time are required'],
    },
    locationType: {
      type: String,
      enum: ['Online', 'Offline'],
      default: 'Online',
    },
    locationDetail: {
      type: String, // Zoom link, Google Meet URL, or physical office address
      trim: true,
      default: '',
    },
    agenda: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    // attribution & relationships
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Meeting host is required'],
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

export default mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);
