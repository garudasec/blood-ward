import api from "../api/axios";

// ─── Recipient Profile ──────────────────────────────────────
export const getRecipientProfile    = ()     => api.get("/recipient/profile").then(r => r.data);
export const updateRecipientProfile = (data) => api.put("/recipient/profile", data).then(r => r.data);

// ─── Donor Search ───────────────────────────────────────────
export const searchDonors = (params) => api.get("/recipient/donors/search", { params }).then(r => r.data);
export const getDonorById = (id)     => api.get(`/recipient/donors/${id}`).then(r => r.data);

// ─── Blood Requests ─────────────────────────────────────────
export const createBloodRequest  = (data) => api.post("/recipient/requests", data).then(r => r.data);
export const getMyRequests       = (params) => api.get("/recipient/requests", { params }).then(r => r.data);
export const getMyRequestById    = (id)   => api.get(`/recipient/requests/${id}`).then(r => r.data);
export const cancelRequest       = (id)   => api.patch(`/recipient/requests/${id}/cancel`).then(r => r.data);

// ─── Recipient stats (dashboard) ───────────────────────────
export const getRecipientStats   = ()     => api.get("/recipient/stats").then(r => r.data);
