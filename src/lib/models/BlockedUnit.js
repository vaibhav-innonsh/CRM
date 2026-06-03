import mongoose from 'mongoose';

const BlockedUnitSchema = new mongoose.Schema(
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
    tokenAmount: {
      type: Number,
      required: [true, 'Token deposit amount is required'],
      default: 0,
    },
    expirationDate: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.BlockedUnit || mongoose.model('BlockedUnit', BlockedUnitSchema);
