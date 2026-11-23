import mongoose from 'mongoose';

const inAppNotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
      index: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'potential_match',
        'match_accepted',
        'match_declined',
        'donation_completed',
        'request_cancelled',
        'system',
      ],
      default: 'system',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isOperationalMatchData: {
      type: Boolean,
      default: true,
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

inAppNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
inAppNotificationSchema.index({ match: 1, isOperationalMatchData: 1 });

const InAppNotification = mongoose.model('InAppNotification', inAppNotificationSchema);

export default InAppNotification;
