import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  discount: {
    type: Number, // Discount percentage
    default: 0,
    min: 0,
    max: 100,
  },
  total: {
    type: Number,
    required: true,
  },
});

const QuotationSchema = new mongoose.Schema(
  {
    quoteNumber: {
      type: String,
      required: [true, 'Quotation number is required'],
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Proposal title is required'],
      trim: true,
    },
    // Connections
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      default: null,
    },
    // Timings
    quoteDate: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, 'Validity deadline is required'],
    },
    // Financial breakdowns
    lineItems: [LineItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxRate: {
      type: Number, // Percentage, e.g. 18 for GST
      default: 18,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Accepted', 'Rejected'],
      default: 'Draft',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Attributed corporate owner is required'],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);
