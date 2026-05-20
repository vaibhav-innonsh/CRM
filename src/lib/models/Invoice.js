import mongoose from 'mongoose';

const PaymentRecordSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Payment amount must be greater than zero'],
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Credit Card'],
    required: true,
  },
  transactionRef: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
});

const InvoiceLineItemSchema = new mongoose.Schema({
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
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  total: {
    type: Number,
    required: true,
  },
});

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Invoice title is required'],
      trim: true,
    },
    // Connections references
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
    },
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
    // Timing keys
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Payment due deadline is required'],
    },
    // Pricing breakdowns
    lineItems: [InvoiceLineItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxRate: {
      type: Number,
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
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid', 'Overdue'],
      default: 'Unpaid',
    },
    // Historic payment receipts logged
    payments: [PaymentRecordSchema],
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Billing corporate manager is required'],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
