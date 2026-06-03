import mongoose from 'mongoose';

const PartnerSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    partnerName: {
      type: String,
      required: [true, 'Partner Name is required'],
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    mobile: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    commissionPercentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Partner || mongoose.model('Partner', PartnerSchema);
