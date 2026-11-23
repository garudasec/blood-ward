import mongoose from 'mongoose';

const familyAccessSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked'],
      default: 'pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    decisionAt: {
      type: Date,
      default: null,
    },
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    age: {
      type: Number,
      min: 0,
      max: 120,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Non-binary', 'Prefer not to say', ''],
      default: '',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
      index: true,
    },
    hospitalRegistrationNumber: {
      type: String,
      default: '',
      trim: true,
    },
    wardDepartment: {
      type: String,
      default: '',
      trim: true,
    },
    claimedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    claimCodeHash: {
      type: String,
      select: false,
      default: null,
    },
    claimCodeExpires: {
      type: Date,
      default: null,
    },
    claimCodeUsed: {
      type: Boolean,
      default: false,
    },
    familyAccess: [familyAccessSchema],
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.index({ hospital: 1, hospitalRegistrationNumber: 1 });

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
