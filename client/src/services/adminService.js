import api from "./api";

export const adminService = {
  async getDashboard() {
    try {
      const response = await api.get("/admin/dashboard");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to load admin dashboard" };
    }
  },

  async getUsers(params) {
    try {
      const response = await api.get("/admin/users", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch users" };
    }
  },

  async getUserById(id) {
    try {
      const response = await api.get("/admin/users/" + id);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch user details" };
    }
  },

  async blockUser(id) {
    try {
      const response = await api.patch("/admin/users/" + id + "/block");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to block user" };
    }
  },

  async unblockUser(id) {
    try {
      const response = await api.patch("/admin/users/" + id + "/unblock");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to unblock user" };
    }
  },

  async deactivateUser(id) {
    try {
      const response = await api.delete("/admin/users/" + id);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to deactivate user" };
    }
  },

  async getRequests(params) {
    try {
      const response = await api.get("/admin/requests", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch admin requests" };
    }
  },

  async getRequestById(id) {
    try {
      const response = await api.get("/admin/requests/" + id);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch request details" };
    }
  },

  async cancelRequest(id) {
    try {
      const response = await api.patch("/admin/requests/" + id + "/cancel");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to cancel request" };
    }
  },

  async getAuditLogs(params) {
    try {
      const response = await api.get("/admin/audit-logs", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch audit logs" };
    }
  },
};

export default adminService;
