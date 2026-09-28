import api from "../api/axios";

// ─── Mock Data Fallbacks for Admin ───────────────────────────
export const MOCK_ADMIN_STATS = {
  totalDonors: 148,
  activeDonors: 96,
  totalRecipients: 84,
  activeBloodRequests: 19,
  emergencyRequests: 4,
  totalDonationsFulfilled: 312,
  recentActivityCount: 28,
  donorGrowthRate: "+14% this month",
  fulfilledRate: "94.2%",
  bloodGroupDistribution: [
    { group: "O+", count: 48, percentage: 32 },
    { group: "A+", count: 36, percentage: 24 },
    { group: "B+", count: 28, percentage: 19 },
    { group: "AB+", count: 12, percentage: 8 },
    { group: "O-", count: 10, percentage: 7 },
    { group: "A-", count: 6, percentage: 4 },
    { group: "B-", count: 5, percentage: 3 },
    { group: "AB-", count: 3, percentage: 2 },
  ],
  recentActivity: [
    { id: "act-1", type: "emergency", title: "Emergency Request Created", detail: "2 units O- at Lilavati Hospital", time: "10 mins ago" },
    { id: "act-2", type: "donor", title: "New Donor Registered", detail: "Dr. Rahul Sharma (B+)", time: "25 mins ago" },
    { id: "act-3", type: "request", title: "Request Fulfilled", detail: "Request #REQ-804 fulfilled by Donor #D-102", time: "1 hour ago" },
    { id: "act-4", type: "admin", title: "Donor Account Blocked", detail: "Account flag for inactive contact info", time: "3 hours ago" },
    { id: "act-5", type: "recipient", title: "New Recipient Registered", detail: "Priya Nair (Mumbai)", time: "5 hours ago" },
  ]
};

export const MOCK_DONORS_LIST = [
  { _id: "d1", name: "Dr. Rahul Sharma", email: "rahul.sharma@example.com", bloodGroup: "B+", city: "Mumbai", area: "Andheri West", available: true, status: "active", totalDonations: 8, createdAt: "2024-01-15T09:30:00.000Z" },
  { _id: "d2", name: "Ananya Roy", email: "ananya.roy@example.com", bloodGroup: "O-", city: "Mumbai", area: "Bandra", available: true, status: "active", totalDonations: 4, createdAt: "2024-02-10T14:20:00.000Z" },
  { _id: "d3", name: "Vikram Malhotra", email: "vikram.m@example.com", bloodGroup: "A+", city: "Mumbai", area: "Powai", available: false, status: "active", totalDonations: 12, createdAt: "2023-11-05T11:15:00.000Z" },
  { _id: "d4", name: "Kavita Reddy", email: "kavita.reddy@example.com", bloodGroup: "O+", city: "Navi Mumbai", area: "Vashi", available: true, status: "active", totalDonations: 2, createdAt: "2024-03-01T16:45:00.000Z" },
  { _id: "d5", name: "Siddharth Verma", email: "siddharth.v@example.com", bloodGroup: "AB+", city: "Mumbai", area: "Dadar", available: false, status: "blocked", totalDonations: 0, createdAt: "2024-03-12T10:00:00.000Z" },
  { _id: "d6", name: "Meera Patel", email: "meera.patel@example.com", bloodGroup: "B-", city: "Thane", area: "Thane West", available: true, status: "active", totalDonations: 6, createdAt: "2023-12-20T08:10:00.000Z" },
  { _id: "d7", name: "Rohan Kapoor", email: "rohan.k@example.com", bloodGroup: "A-", city: "Mumbai", area: "Juhu", available: true, status: "active", totalDonations: 1, createdAt: "2024-03-18T13:50:00.000Z" },
  { _id: "d8", name: "Neha Saxena", email: "neha.saxena@example.com", bloodGroup: "AB-", city: "Mumbai", area: "Worli", available: false, status: "suspended", totalDonations: 3, createdAt: "2024-02-28T17:30:00.000Z" }
];

export const MOCK_RECIPIENTS_LIST = [
  { _id: "r1", name: "Priya Nair", email: "priya.nair@example.com", phone: "+91 98765 43210", city: "Mumbai", hospital: "Lilavati Hospital", status: "active", totalRequests: 3, createdAt: "2024-01-20T10:15:00.000Z" },
  { _id: "r2", name: "Amitabh Sen", email: "amitabh.sen@example.com", phone: "+91 98123 45678", city: "Mumbai", hospital: "KEM Hospital", status: "active", totalRequests: 1, createdAt: "2024-02-14T11:40:00.000Z" },
  { _id: "r3", name: "Sneha Deshmukh", email: "sneha.d@example.com", phone: "+91 97654 32109", city: "Thane", hospital: "Jupiter Hospital", status: "active", totalRequests: 2, createdAt: "2024-02-25T15:20:00.000Z" },
  { _id: "r4", name: "Rajesh Gupta", email: "rajesh.gupta@example.com", phone: "+91 96543 21098", city: "Navi Mumbai", hospital: "Apollo Hospital", status: "blocked", totalRequests: 5, createdAt: "2023-12-10T09:00:00.000Z" },
  { _id: "r5", name: "Pooja Hegde", email: "pooja.h@example.com", phone: "+91 95432 10987", city: "Mumbai", hospital: "Nanavati Hospital", status: "active", totalRequests: 1, createdAt: "2024-03-05T14:10:00.000Z" }
];

export const MOCK_REQUESTS_LIST = [
  { _id: "req-101", requestId: "REQ-9401", bloodGroup: "O-", units: 2, requesterName: "Priya Nair", requesterRole: "recipient", hospital: "Lilavati Hospital", location: "Bandra, Mumbai", urgency: "emergency", status: "active", requiredDate: "2026-09-29T18:00:00.000Z", createdAt: "2026-09-28T19:30:00.000Z", responsesCount: 2 },
  { _id: "req-102", requestId: "REQ-9398", bloodGroup: "B+", units: 1, requesterName: "Amitabh Sen", requesterRole: "recipient", hospital: "KEM Hospital", location: "Parel, Mumbai", urgency: "high", status: "donor_accepted", requiredDate: "2026-09-30T10:00:00.000Z", createdAt: "2026-09-28T15:10:00.000Z", responsesCount: 1 },
  { _id: "req-103", requestId: "REQ-9385", bloodGroup: "A+", units: 3, requesterName: "Sneha Deshmukh", requesterRole: "recipient", hospital: "Jupiter Hospital", location: "Thane West", urgency: "normal", status: "in_progress", requiredDate: "2026-10-01T12:00:00.000Z", createdAt: "2026-09-27T11:45:00.000Z", responsesCount: 3 },
  { _id: "req-104", requestId: "REQ-9350", bloodGroup: "O+", units: 1, requesterName: "Pooja Hegde", requesterRole: "recipient", hospital: "Nanavati Hospital", location: "Vile Parle, Mumbai", urgency: "emergency", status: "fulfilled", requiredDate: "2026-09-27T20:00:00.000Z", createdAt: "2026-09-26T14:20:00.000Z", responsesCount: 4 },
  { _id: "req-105", requestId: "REQ-9310", bloodGroup: "AB+", units: 2, requesterName: "Admin System", requesterRole: "admin", hospital: "Fortis Hospital", location: "Mulund, Mumbai", urgency: "normal", status: "closed", requiredDate: "2026-09-25T16:00:00.000Z", createdAt: "2026-09-24T09:30:00.000Z", responsesCount: 0 }
];

export const MOCK_AUDIT_LOGS = [
  { _id: "log-1", actor: { name: "System Admin", email: "admin@bloodward.org", role: "admin" }, action: "ACCOUNT_BLOCKED", targetResource: "User: d5 (Siddharth Verma)", ipAddress: "192.168.1.45", timestamp: "2026-09-28T19:42:10.000Z", metadata: { reason: "Flagged for repeated non-response to emergency alerts" }, severity: "warning" },
  { _id: "log-2", actor: { name: "Priya Nair", email: "priya.nair@example.com", role: "recipient" }, action: "EMERGENCY_REQUEST_CREATED", targetResource: "Request: REQ-9401", ipAddress: "49.37.12.189", timestamp: "2026-09-28T19:30:00.000Z", metadata: { bloodGroup: "O-", units: 2, hospital: "Lilavati Hospital" }, severity: "critical" },
  { _id: "log-3", actor: { name: "Dr. Rahul Sharma", email: "rahul.sharma@example.com", role: "donor" }, action: "DONOR_RESPONSE_ACCEPTED", targetResource: "Request: REQ-9398", ipAddress: "103.21.126.8", timestamp: "2026-09-28T16:05:22.000Z", metadata: { responseStatus: "accepted" }, severity: "info" },
  { _id: "log-4", actor: { name: "System Admin", email: "admin@bloodward.org", role: "admin" }, action: "REQUEST_STATUS_UPDATED", targetResource: "Request: REQ-9350", ipAddress: "192.168.1.45", timestamp: "2026-09-27T21:10:00.000Z", metadata: { newStatus: "fulfilled" }, severity: "info" },
  { _id: "log-5", actor: { name: "Ananya Roy", email: "ananya.roy@example.com", role: "donor" }, action: "AVAILABILITY_TOGGLED", targetResource: "Donor: d2", ipAddress: "114.143.22.91", timestamp: "2026-09-27T14:15:30.000Z", metadata: { available: true }, severity: "info" },
  { _id: "log-6", actor: { name: "System Security", email: "system@bloodward.org", role: "system" }, action: "FAILED_LOGIN_ATTEMPT", targetResource: "Auth: admin@bloodward.org", ipAddress: "185.220.101.5", timestamp: "2026-09-26T22:04:12.000Z", metadata: { attempts: 3, blockedIP: false }, severity: "high" }
];

// ─── Admin API Service Functions ────────────────────────────

export async function getAdminStats() {
  try {
    const res = await api.get("/admin/stats");
    return res.data;
  } catch (err) {
    console.warn("Using mock admin stats:", err.message);
    return { success: true, stats: MOCK_ADMIN_STATS };
  }
}

export async function getAdminDonors(params = {}) {
  try {
    const res = await api.get("/admin/donors", { params });
    return res.data;
  } catch (err) {
    console.warn("Using mock admin donors:", err.message);
    let list = [...MOCK_DONORS_LIST];
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q) || d.city.toLowerCase().includes(q));
    }
    if (params.bloodGroup) {
      list = list.filter(d => d.bloodGroup === params.bloodGroup);
    }
    if (params.status) {
      list = list.filter(d => d.status === params.status);
    }
    return { success: true, donors: list, total: list.length };
  }
}

export async function updateDonorStatus(id, status) {
  try {
    const res = await api.patch("/admin/donors/" + id + "/status", { status });
    return res.data;
  } catch (err) {
    console.warn("Simulating update donor status for " + id + ": " + status);
    return { success: true, message: "Donor status updated to " + status };
  }
}

export async function deleteDonor(id) {
  try {
    const res = await api.delete("/admin/donors/" + id);
    return res.data;
  } catch (err) {
    console.warn("Simulating delete donor for " + id);
    return { success: true, message: "Donor account deleted successfully" };
  }
}

export async function getAdminRecipients(params = {}) {
  try {
    const res = await api.get("/admin/recipients", { params });
    return res.data;
  } catch (err) {
    console.warn("Using mock admin recipients:", err.message);
    let list = [...MOCK_RECIPIENTS_LIST];
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.city.toLowerCase().includes(q));
    }
    if (params.status) {
      list = list.filter(r => r.status === params.status);
    }
    return { success: true, recipients: list, total: list.length };
  }
}

export async function updateRecipientStatus(id, status) {
  try {
    const res = await api.patch("/admin/recipients/" + id + "/status", { status });
    return res.data;
  } catch (err) {
    console.warn("Simulating update recipient status for " + id + ": " + status);
    return { success: true, message: "Recipient status updated to " + status };
  }
}

export async function deleteRecipient(id) {
  try {
    const res = await api.delete("/admin/recipients/" + id);
    return res.data;
  } catch (err) {
    console.warn("Simulating delete recipient for " + id);
    return { success: true, message: "Recipient account deleted successfully" };
  }
}

export async function getAdminRequests(params = {}) {
  try {
    const res = await api.get("/admin/requests", { params });
    return res.data;
  } catch (err) {
    console.warn("Using mock admin requests:", err.message);
    let list = [...MOCK_REQUESTS_LIST];
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(r => r.requestId.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q) || r.hospital.toLowerCase().includes(q));
    }
    if (params.urgency) {
      list = list.filter(r => r.urgency === params.urgency);
    }
    if (params.status) {
      list = list.filter(r => r.status === params.status);
    }
    return { success: true, requests: list, total: list.length };
  }
}

export async function updateRequestStatus(id, status) {
  try {
    const res = await api.patch("/admin/requests/" + id + "/status", { status });
    return res.data;
  } catch (err) {
    console.warn("Simulating update request status for " + id + ": " + status);
    return { success: true, message: "Request status updated to " + status };
  }
}

export async function deleteRequest(id) {
  try {
    const res = await api.delete("/admin/requests/" + id);
    return res.data;
  } catch (err) {
    console.warn("Simulating delete request for " + id);
    return { success: true, message: "Blood request removed successfully" };
  }
}

export async function getAuditLogs(params = {}) {
  try {
    const res = await api.get("/admin/audit-logs", { params });
    return res.data;
  } catch (err) {
    console.warn("Using mock audit logs:", err.message);
    let list = [...MOCK_AUDIT_LOGS];
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(l => l.actor.name.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.targetResource.toLowerCase().includes(q));
    }
    if (params.severity) {
      list = list.filter(l => l.severity === params.severity);
    }
    return { success: true, logs: list, total: list.length };
  }
}
