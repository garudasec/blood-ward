import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: [true, 'Blood request reference is required'],
      index: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donor user reference is required'],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
      index: true,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    unitsNeeded: {
      type: Number,
      default: 1,
      min: 1,
    },
    urgency: {
      type: String,
      enum: ['Normal', 'High', 'Emergency'],
      default: 'Normal',
    },
    status: {
      type: String,
      enum: [
        'Potential Match',
        'Awaiting Response',
        'Accepted',
        'Declined',
        'Completed',
        'Cancelled',
        'Expired',
      ],
      default: 'Awaiting Response',
      index: true,
    },
    notifiedAt: {
      type: Date,
      default: Date.now,
    },
    donorRespondedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate match records between a request and donor
matchSchema.index({ request: 1, donor: 1 }, { unique: true });

// Query optimization indexes
matchSchema.index({ donor: 1, status: 1, createdAt: -1 });
matchSchema.index({ recipient: 1, status: 1, createdAt: -1 });
matchSchema.index({ status: 1, completedAt: 1 });

const Match = mongoose.model('Match', matchSchema);

export default Match;
