import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    builderName: {
      type: String,
      required: [true, 'Builder name is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Project location is required'],
      trim: true,
    },
    launchDate: {
      type: Date,
      default: null,
    },
    possessionDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Under Construction', 'Ready To Move', 'Completed'],
      default: 'Under Construction',
    },
    totalUnits: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
