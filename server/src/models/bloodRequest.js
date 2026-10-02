import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (val) {
          return (
            Array.isArray(val) &&
            val.length === 2 &&
            typeof val[0] === 'number' &&
            !Number.isNaN(val[0]) &&
            typeof val[1] === 'number' &&
            !Number.isNaN(val[1])
          );
        },
        message: 'Coordinates must contain exactly two numbers [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

const bloodRequestSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsNeeded: {
      type: Number,
      required: true,
      min: [1, 'Units needed must be at least 1'],
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
    location: {
      type: pointSchema,
      required: false,
    },
    urgency: {
      type: String,
      required: true,
      enum: ['Normal', 'High', 'Emergency'],
      default: 'Normal',
    },
    status: {
      type: String,
      required: true,
      enum: [
        'Created',
        'Active',
        'Donor Accepted',
        'In Progress',
        'Fulfilled',
        'Cancelled',
        'Expired',
      ],
      default: 'Active',
    },
    requiredDate: {
      type: String,
      required: true,
      trim: true,
    },
    additionalNotes: {
      type: String,
      default: '',
      trim: true,
    },
    donorResponsesCount: {
      type: Number,
      default: 0,
    },
    acceptedDonor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ recipient: 1 });
bloodRequestSchema.index({ status: 1 });
bloodRequestSchema.index({ bloodGroup: 1 });

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);

export default BloodRequest;
