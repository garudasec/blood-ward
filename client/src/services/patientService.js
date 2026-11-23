import api from './api';

export const patientService = {
  // Claim a patient record with single-use claim code
  async claimPatient(patientId, claimCode) {
    try {
      const response = await api.post('/patients/claim', { patientId, claimCode });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to claim patient record' };
    }
  },

  // Fetch all patient records associated with current user
  async getMyPatients() {
    try {
      const response = await api.get('/patients/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch patient records' };
    }
  },

  // Get detailed patient record by ID
  async getPatientById(id) {
    try {
      const response = await api.get(`/patients/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch patient details' };
    }
  },

  // Reissue a claim code (Hospital representative or Admin)
  async reissueClaimCode(patientId) {
    try {
      const response = await api.post(`/patients/${patientId}/reissue-claim-code`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to reissue claim code' };
    }
  },

  // Request family access to a patient record
  async requestFamilyAccess(patientId, relationship, notes = '') {
    try {
      const response = await api.post(`/patients/${patientId}/family-access`, {
        relationship,
        notes,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to request family access' };
    }
  },

  // Approve, reject, or revoke family access
  async updateFamilyAccess(patientId, accessId, status, notes = '') {
    try {
      const response = await api.patch(`/patients/${patientId}/family-access/${accessId}`, {
        status,
        notes,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update family access status' };
    }
  },
};
