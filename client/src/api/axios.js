import axios from "axios";

/**
 * Centralized Axios instance for BloodWard API.
 * All requests use credentials:include for HttpOnly cookie auth.
 */
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Response interceptor — normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      (err.code === "ECONNABORTED" ? "Request timed out. Please try again." : null) ||
      (err.message === "Network Error" ? "Network error. Please check your connection." : null) ||
      "An unexpected error occurred.";

    const status = err?.response?.status;
    const normalized = new Error(msg);
    normalized.status = status;
    normalized.original = err;
    return Promise.reject(normalized);
  }
);

export default api;
