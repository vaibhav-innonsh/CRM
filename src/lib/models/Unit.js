import mongoose from 'mongoose';

const UnitSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    unitNumber: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true,
    },
    tower: {
      type: String,
      default: '',
      trim: true,
    },
    floor: {
      type: String,
      default: '',
      trim: true,
    },
    propertyType: {
      type: String,
      default: 'Apartment',
      trim: true,
    },
    area: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    facing: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Available', 'Blocked', 'Booked', 'Sold'],
      default: 'Available',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Unit || mongoose.model('Unit', UnitSchema);
