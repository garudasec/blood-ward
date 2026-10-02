import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'AUTH',
        'DONOR_ACTION',
        'RECIPIENT_ACTION',
        'REQUEST_MGMT',
        'ADMIN_ACTION',
        'SECURITY',
        'SYSTEM',
      ],
      default: 'SYSTEM',
    },
    target: {
      type: String,
      default: '',
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
      trim: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
      default: 'NORMAL',
    },
    details: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ category: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
