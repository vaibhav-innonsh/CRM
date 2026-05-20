import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Task subject is required'],
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Task due date is required'],
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // Attribution & Relations
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assignee is required'],
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null, // Optional connection to raw prospects
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null, // Optional connection to qualified customer contacts
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
