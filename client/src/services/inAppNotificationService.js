import api from "./api";

export const inAppNotificationService = {
  async getMyNotifications(params = {}) {
    try {
      const response = await api.get("/notifications", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch notifications" };
    }
  },

  async markRead(id) {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to mark notification read" };
    }
  },

  async markAllRead() {
    try {
      const response = await api.patch("/notifications/read-all");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to mark all notifications read" };
    }
  },

  async markAsRead(id) {
    return this.markRead(id);
  },

  async markAllAsRead() {
    return this.markAllRead();
  },
};
