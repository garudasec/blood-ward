import InAppNotification from '../models/inAppNotification.model.js';
import AppError from '../utils/appError.js';

/**
 * @desc    Get in-app notifications for authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { user: userId };
    if (unreadOnly === 'true' || unreadOnly === true) {
      query.read = false;
    }

    const total = await InAppNotification.countDocuments(query);
    const unreadCount = await InAppNotification.countDocuments({ user: userId, read: false });

    const notifications = await InAppNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a single in-app notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await InAppNotification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return next(new AppError('Notification not found or unauthorized.', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all in-app notifications as read for current user
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await InAppNotification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    next(error);
  }
};
