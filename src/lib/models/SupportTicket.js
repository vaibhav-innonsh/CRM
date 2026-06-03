import mongoose from 'mongoose';

const TicketCommentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Comment text is required'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    senderName: {
      type: String,
      required: true,
      default: 'User',
    },
    isInternal: {
      type: Boolean,
      default: false, // Internal notes between company team members, hidden from clients
    },
  },
  {
    timestamps: true,
  }
);

const TicketAttachmentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  fileData: {
    type: String, // Stored as Base64 string for complete standalone portability
    required: true,
  },
  fileType: {
    type: String,
    default: '',
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  uploadedBy: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true, // E.g., TKT-1234, generated on save
    },
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true,
    },
    ticketType: {
      type: String,
      enum: ['Bug Report', 'Change Request', 'Feature Request', 'Login Issue', 'Hosting Issue'],
      required: [true, 'Ticket type is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['New', 'In Progress', 'Pending Client', 'Resolved', 'Closed'],
      default: 'New',
    },
    // Multi-tenant Organization Link
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    // Customer Contact reporting the ticket
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
    // Support Staff/Dev assignee handling the ticket
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    comments: [TicketCommentSchema],
    attachments: [TicketAttachmentSchema],
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate a readable random ticket ID before validation
SupportTicketSchema.pre('validate', function (next) {
  if (this.isNew && !this.ticketId) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.ticketId = `TKT-${randomNum}`;
  }
  next();
});

export default mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);
