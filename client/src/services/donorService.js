import api from "../api/axios";

// ─── Donor Profile ──────────────────────────────────────────
export const getDonorProfile    = ()       => api.get("/donor/profile").then(r => r.data);
export const updateDonorProfile = (data)   => api.put("/donor/profile", data).then(r => r.data);

// ─── Availability ───────────────────────────────────────────
export const setAvailability    = (available) => api.patch("/donor/availability", { available }).then(r => r.data);

// ─── Requests visible to donor ──────────────────────────────
export const getDonorRequests   = (params) => api.get("/donor/requests", { params }).then(r => r.data);
export const getRequestById     = (id)     => api.get(`/donor/requests/${id}`).then(r => r.data);
export const respondToRequest   = (id, action) => api.post(`/donor/requests/${id}/respond`, { action }).then(r => r.data);

// ─── Donor history ──────────────────────────────────────────
export const getDonorHistory    = (params) => api.get("/donor/history", { params }).then(r => r.data);

// ─── Donor stats (dashboard) ────────────────────────────────
export const getDonorStats      = ()       => api.get("/donor/stats").then(r => r.data);
