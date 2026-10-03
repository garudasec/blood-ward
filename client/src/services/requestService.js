import api from "./api";

export const requestService = {
  async create(data) {
    try {
      const response = await api.post("/requests", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to create request" };
    }
  },

  async getMyRequests(params) {
    try {
      const response = await api.get("/requests/my", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch requests" };
    }
  },

  async getAvailableRequests(params) {
    try {
      const response = await api.get("/requests/available", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch available requests" };
    }
  },

  async getDonorHistory(params) {
    try {
      const response = await api.get("/requests/donor/history", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch donor history" };
    }
  },

  async getById(id) {
    try {
      const response = await api.get("/requests/" + id);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch request details" };
    }
  },

  async accept(id) {
    try {
      const response = await api.patch("/requests/" + id + "/accept");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to accept request" };
    }
  },

  async reject(id) {
    try {
      const response = await api.patch("/requests/" + id + "/reject");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to decline request" };
    }
  },

  async markInProgress(id) {
    try {
      const response = await api.patch("/requests/" + id + "/in-progress");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to update status to in-progress" };
    }
  },

  async fulfill(id) {
    try {
      const response = await api.patch("/requests/" + id + "/fulfill");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fulfill request" };
    }
  },

  async cancel(id) {
    try {
      const response = await api.patch("/requests/" + id + "/cancel");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to cancel request" };
    }
  },
};

export default requestService;
