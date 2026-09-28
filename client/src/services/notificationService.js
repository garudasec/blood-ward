import api from "../api/axios";

export const getNotifications    = () => api.get("/notifications").then(r => r.data);
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`).then(r => r.data);
export const markAllRead          = () => api.patch("/notifications/read-all").then(r => r.data);
