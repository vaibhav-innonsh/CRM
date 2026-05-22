import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      select: false, // Prevents password from being returned in standard queries
    },
    role: {
      type: String,
      enum: ['owner', 'sales_admin', 'sales_rep'],
      default: 'sales_rep',
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved', // Pre-seeded or admin-created users are already approved
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Auto-creates createdAt and updatedAt
  }
);

// Prevents recompiling model during Next.js hot reload
export default mongoose.models.User || mongoose.model('User', UserSchema);
