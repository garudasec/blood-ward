import AuditLog from '../models/auditLog.js';

/**
 * Log a structured audit event to MongoDB AuditLog collection
 */
export const logAuditEvent = async ({
  actor = null,
  actorName = 'System',
  action,
  category = 'SYSTEM',
  target = '',
  ipAddress = '127.0.0.1',
  severity = 'NORMAL',
  details = '',
}) => {
  try {
    let safeDetails = details;
    if (typeof details === 'object' && details !== null) {
      const copy = { ...details };
      delete copy.password;
      delete copy.passwordHash;
      delete copy.token;
      delete copy.cookie;
      delete copy.jwt;
      safeDetails = JSON.stringify(copy);
    } else if (typeof details === 'string') {
      // Remove any inline sensitive strings
      safeDetails = details.replace(/("password"|"token"|"cookie"):\s*".*?"/gi, '$1:"[REDACTED]"');
    }

    await AuditLog.create({
      actor: actor || undefined,
      actorName: actorName || 'System',
      action,
      category,
      target,
      ipAddress: ipAddress || '127.0.0.1',
      severity,
      details: safeDetails,
    });
  } catch (err) {
    console.error('[AuditLog Warning] Failed to save audit log:', err.message);
  }
};
