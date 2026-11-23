import api from './api';

export const notificationAdminService = {
  // Fetch all notification providers
  async getProviders(params = {}) {
    try {
      const response = await api.get('/admin/notification-providers', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch notification providers' };
    }
  },

  // Fetch provider by ID
  async getProviderById(id) {
    try {
      const response = await api.get(`/admin/notification-providers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch provider details' };
    }
  },

  // Create new provider
  async createProvider(providerData) {
    try {
      const response = await api.post('/admin/notification-providers', providerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create notification provider' };
    }
  },

  // Update existing provider (and optionally replace credentials)
  async updateProvider(id, updateData) {
    try {
      const response = await api.patch(`/admin/notification-providers/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update notification provider' };
    }
  },

  // Toggle enabled/disabled state
  async toggleProvider(id) {
    try {
      const response = await api.patch(`/admin/notification-providers/${id}/toggle`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to toggle provider state' };
    }
  },

  // Recover unhealthy provider
  async recoverProvider(id) {
    try {
      const response = await api.patch(`/admin/notification-providers/${id}/recover`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to recover provider health' };
    }
  },

  // Test provider dispatch or connectivity
  async testProvider(id, testData = {}) {
    try {
      const response = await api.post(`/admin/notification-providers/${id}/test`, testData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Provider test action failed' };
    }
  },

  // Delete provider
  async deleteProvider(id) {
    try {
      const response = await api.delete(`/admin/notification-providers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete notification provider' };
    }
  },

  // Fetch paginated delivery logs
  async getNotificationLogs(params = {}) {
    try {
      const response = await api.get('/admin/notification-logs', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch delivery logs' };
    }
  },

  // Fetch monitoring metrics and quota statistics
  async getNotificationStats() {
    try {
      const response = await api.get('/admin/notification-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch notification metrics' };
    }
  },
};

export default notificationAdminService;
