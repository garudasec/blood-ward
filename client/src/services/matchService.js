import api from "./api";

export const matchService = {
  async getMyMatches(params = {}) {
    try {
      const response = await api.get("/matches/my-matches", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch matches" };
    }
  },

  async acceptMatch(id) {
    try {
      const response = await api.patch(`/matches/${id}/accept`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to accept match" };
    }
  },

  async declineMatch(id) {
    try {
      const response = await api.patch(`/matches/${id}/decline`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to decline match" };
    }
  },
};
