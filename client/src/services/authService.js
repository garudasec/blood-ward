import api from "./api";

let currentUserPromise = null;

export const authService = {
  // Login user (donor, recipient, or admin)
  async login(credentials) {
    try {
      const response = await api.post("/auth/login", credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Invalid login credentials" };
    }
  },

  // Register Donor
  async registerDonor(donorData) {
    try {
      const response = await api.post("/auth/register/donor", donorData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Donor registration failed" };
    }
  },

  // Register Recipient
  async registerRecipient(recipientData) {
    try {
      const response = await api.post("/auth/register/recipient", recipientData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Recipient registration failed" };
    }
  },

  // Fetch current session profile (HttpOnly cookie will be sent automatically)
  // Deduplicates concurrent in-flight requests (e.g. during React StrictMode mount)
  async getCurrentUser() {
    if (currentUserPromise) {
      return currentUserPromise;
    }

    currentUserPromise = (async () => {
      try {
        const response = await api.get("/auth/me");
        if (response.data && response.data.authenticated !== false && response.data.user) {
          return response.data;
        }
        return { user: null, authenticated: false };
      } catch (error) {
        // Fallback for any 401: return clean logged-out state without throwing
        if (error.response?.status === 401) {
          return { user: null, authenticated: false };
        }
        throw error.response?.data || { message: "Session check failed" };
      } finally {
        currentUserPromise = null;
      }
    })();

    return currentUserPromise;
  },

  // Update current session profile (authenticated user)
  async updateProfile(profileData) {
    try {
      const response = await api.put("/auth/me", profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Profile update failed" };
    }
  },

  // Logout user (clears HttpOnly cookie on backend)
  async logout() {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Logout failed" };
    }
  },

  // Request password reset link
  async forgotPassword(email) {
    try {
      const response = await api.post("/auth/forgot-password", { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to request password reset" };
    }
  },

  // Reset password with token
  async resetPassword(token, passwordData) {
    try {
      const response = await api.post(`/auth/reset-password/${token}`, passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to reset password" };
    }
  },
};
