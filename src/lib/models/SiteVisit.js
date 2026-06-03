import mongoose from 'mongoose';

const SiteVisitSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    visitDate: {
      type: Date,
      required: [true, 'Visit date is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    feedback: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SiteVisit || mongoose.model('SiteVisit', SiteVisitSchema);
