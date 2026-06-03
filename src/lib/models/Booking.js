import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema(
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
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
    },
    bookingAmount: {
      type: Number,
      required: [true, 'Booking amount is required'],
      default: 0,
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Confirmed',
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

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
