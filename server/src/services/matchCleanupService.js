import Match from '../models/match.model.js';
import InAppNotification from '../models/inAppNotification.model.js';

export const RETENTION_PERIOD_DAYS = 45;
export const RETENTION_PERIOD_MS = RETENTION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Executes the 45-day automatic cleanup of completed donation matches and their operational in-app notifications.
 *
 * Safety rules:
 * - Only operates on status === 'Completed'
 * - Retention cutoff is strictly based on `completedAt` timestamp (not createdAt)
 * - Retains pending, accepted, in-progress, or uncompleted matches
 * - Retains unrelated donor, recipient, hospital, and blood-request records
 * - Retains unrelated notifications belonging to users
 * - Idempotent: can be executed multiple times without unintended deletions
 *
 * @param {Date} [customCutoffDate] - Optional cutoff date override for testing
 * @returns {Promise<{ deletedMatchesCount: number, deletedNotificationsCount: number, cutoffDate: Date }>}
 */
export async function runMatchCleanupJob(customCutoffDate = null) {
  const cutoffDate = customCutoffDate || new Date(Date.now() - RETENTION_PERIOD_MS);

  try {
    // 1. Identify completed match records where completedAt <= cutoffDate
    const eligibleMatches = await Match.find({
      status: 'Completed',
      completedAt: { $exists: true, $ne: null, $lte: cutoffDate },
    }).select('_id');

    if (!eligibleMatches || eligibleMatches.length === 0) {
      console.log(`[MatchCleanupService] No completed match records older than ${RETENTION_PERIOD_DAYS} days found.`);
      return {
        deletedMatchesCount: 0,
        deletedNotificationsCount: 0,
        cutoffDate,
      };
    }

    const matchIds = eligibleMatches.map((m) => m._id);

    // 2. Delete operational in-app notification records linked to these completed matches
    const notificationDeleteResult = await InAppNotification.deleteMany({
      match: { $in: matchIds },
      isOperationalMatchData: true,
    });

    // 3. Delete the completed match records
    const matchDeleteResult = await Match.deleteMany({
      _id: { $in: matchIds },
    });

    const deletedMatchesCount = matchDeleteResult.deletedCount || 0;
    const deletedNotificationsCount = notificationDeleteResult.deletedCount || 0;

    console.log(
      `[MatchCleanupService] Completed 45-day retention cleanup. Deleted ${deletedMatchesCount} completed match record(s) and ${deletedNotificationsCount} operational notification(s) older than ${cutoffDate.toISOString()}.`
    );

    return {
      deletedMatchesCount,
      deletedNotificationsCount,
      cutoffDate,
    };
  } catch (err) {
    console.error('[MatchCleanupService] Error running match cleanup job:', err.message);
    throw err;
  }
}
