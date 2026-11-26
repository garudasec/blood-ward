import mongoose from 'mongoose';

const investigationNoteSchema = new mongoose.Schema(
  {
    note: {
      type: String,
      required: true,
      trim: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: false,
      default: null,
      index: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: false,
      default: null,
      index: true,
    },
    bloodRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: false,
      default: null,
      index: true,
    },
    complainant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    complainantType: {
      type: String,
      enum: ['patient', 'family_member', 'recipient', 'donor', 'public'],
      default: 'public',
      required: true,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    familyRelationship: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Blood was not provided to the intended patient',
        'Hospital did not respond after donor acceptance',
        'Suspected diversion of donated blood',
        'Incorrect information was provided',
        'Other concern',
      ],
      default: 'Other concern',
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      minlength: [20, 'Complaint description must be at least 20 characters'],
      maxlength: [2000, 'Complaint description cannot exceed 2000 characters'],
      trim: true,
    },
    evidenceUrls: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Pending', 'Submitted', 'Under Review', 'Investigation', 'Resolved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    investigationNotes: [investigationNoteSchema],
    resolutionReason: {
      type: String,
      default: '',
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

complaintSchema.index({ bloodRequest: 1, complainant: 1 }, { sparse: true });

complaintSchema.pre('validate', function () {
  if (!this.bloodRequest && (!this.patient || !this.hospital)) {
    throw new Error('A complaint must reference either a BloodRequest or both a Patient and Hospital.');
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
