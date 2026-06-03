import mongoose from 'mongoose';

const PossessionSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
    },
    possessionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Handed Over', 'Delayed'],
      default: 'Scheduled',
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Possession || mongoose.model('Possession', PossessionSchema);
