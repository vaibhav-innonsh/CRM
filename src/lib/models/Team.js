import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a team name.'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Each sales team must have an assigned Sales Manager as a Leader.'],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    region: {
      type: String,
      trim: true,
      default: 'General',
    },
    targetAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
