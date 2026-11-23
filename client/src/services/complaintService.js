import api from './api';

export const complaintService = {
  // Submit a public complaint (unauthenticated)
  async submitPublicComplaint(complaintData) {
    try {
      const response = await api.post('/complaints/public', complaintData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit public complaint' };
    }
  },

  // Submit a complaint (patient or authorized family member)
  async submitComplaint(complaintData) {
    try {
      const response = await api.post('/complaints', complaintData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit complaint' };
    }
  },

  // Get current user's submitted complaints
  async getMyComplaints() {
    try {
      const response = await api.get('/complaints/my');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch your complaints' };
    }
  },

  // Get complaint details by ID
  async getComplaintById(id) {
    try {
      const response = await api.get(`/complaints/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch complaint details' };
    }
  },

  // Admin: Get paginated complaints list
  async getAdminComplaints(params = {}) {
    try {
      const response = await api.get('/admin/complaints', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch admin complaints' };
    }
  },

  // Admin: Update complaint status & investigation note
  async updateComplaintStatus(id, status, note = '') {
    try {
      const response = await api.patch(`/admin/complaints/${id}/status`, { status, note });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update complaint status' };
    }
  },

  // Admin: Resolve or reject complaint
  async resolveComplaint(id, status, resolutionReason, note = '') {
    try {
      const response = await api.patch(`/admin/complaints/${id}/resolve`, {
        status,
        resolutionReason,
        note,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to resolve complaint' };
    }
  },
};
