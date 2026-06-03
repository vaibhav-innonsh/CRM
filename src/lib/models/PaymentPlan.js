import mongoose from 'mongoose';

const PaymentPlanSchema = new mongoose.Schema(
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
      unique: true,
    },
    planTitle: {
      type: String,
      required: [true, 'Payment plan title is required'],
    },
    totalValuation: {
      type: Number,
      required: true,
      default: 0,
    },
    milestones: {
      type: mongoose.Schema.Types.Mixed, // JSON Array
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PaymentPlan || mongoose.model('PaymentPlan', PaymentPlanSchema);
