import api from './api';

export const authService = {
  // Login user (donor, recipient, or admin)
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  // Register Donor
  async registerDonor(donorData) {
    try {
      const response = await api.post('/auth/register/donor', donorData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Donor registration failed' };
    }
  },

  // Register Recipient
  async registerRecipient(recipientData) {
    try {
      const response = await api.post('/auth/register/recipient', recipientData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Recipient registration failed' };
    }
  },

  // Fetch current session profile (HttpOnly cookie will be sent automatically)
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Session expired' };
    }
  },

  // Logout user (clears HttpOnly cookie on backend)
  async logout() {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Logout failed' };
    }
  },
};