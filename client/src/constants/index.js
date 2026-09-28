export const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

export const URGENCY_LEVELS = [
  { value: "normal",    label: "Normal",    color: "#6b7280" },
  { value: "high",      label: "High",      color: "#f59e0b" },
  { value: "emergency", label: "Emergency", color: "#ef4444" },
];

export const REQUEST_STATUSES = [
  { value: "created",         label: "Created",         color: "#6b7280" },
  { value: "active",          label: "Active",          color: "#3b82f6" },
  { value: "donor_accepted",  label: "Donor Accepted",  color: "#8b5cf6" },
  { value: "in_progress",     label: "In Progress",     color: "#f59e0b" },
  { value: "fulfilled",       label: "Fulfilled",       color: "#10b981" },
  { value: "completed",       label: "Completed",       color: "#22c55e" },
  { value: "cancelled",       label: "Cancelled",       color: "#ef4444" },
  { value: "expired",         label: "Expired",         color: "#9ca3af" },
];

export const DISTANCE_OPTIONS = [
  { value: 2,   label: "2 km" },
  { value: 5,   label: "5 km" },
  { value: 7,   label: "7 km" },
  { value: 10,  label: "10 km" },
  { value: 20,  label: "20 km" },
  { value: 0,   label: "Any distance" },
];

export const SORT_OPTIONS = [
  { value: "nearest",  label: "Nearest first" },
  { value: "farthest", label: "Farthest first" },
  { value: "recent",   label: "Recently active" },
];

export const SOCKET_EVENTS = {
  CONNECT:              "connect",
  DISCONNECT:           "disconnect",
  NEW_NOTIFICATION:     "notification:new",
  REQUEST_UPDATE:       "request:update",
  EMERGENCY_NEARBY:     "emergency:nearby",
  DONOR_RESPONDED:      "donor:responded",
};
