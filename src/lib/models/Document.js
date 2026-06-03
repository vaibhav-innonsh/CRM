import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
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
      default: null,
    },
    documentName: {
      type: String,
      required: [true, 'Document Name is required'],
      trim: true,
    },
    documentType: {
      type: String,
      required: [true, 'Document Type is required'],
      trim: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      default: 'Verified',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Document || mongoose.model('Document', DocumentSchema);
