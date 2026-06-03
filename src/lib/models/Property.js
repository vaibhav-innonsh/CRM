import mongoose from 'mongoose';

const PropertySchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Apartment', 'Villa', 'Plot', 'Commercial'],
      default: 'Apartment',
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    size: {
      type: Number,
      required: [true, 'Size is required'],
      min: [0, 'Size cannot be negative'],
      default: 0,
    },
    beds: {
      type: Number,
      default: 0,
    },
    baths: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Available', 'Blocked', 'Sold'],
      default: 'Available',
    },
    image: {
      type: String,
      default: '',
    },
    amenities: {
      type: [String],
      default: [],
    },
    customData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Property || mongoose.model('Property', PropertySchema);
