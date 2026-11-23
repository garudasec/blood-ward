export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const URGENCY_LEVELS = {
  NORMAL: "Normal",
  HIGH: "High",
  EMERGENCY: "Emergency",
};

export const REQUEST_STATUS = {
  CREATED: "Created",
  ACTIVE: "Active",
  DONOR_ACCEPTED: "Donor Accepted",
  IN_PROGRESS: "In Progress",
  FULFILLED: "Fulfilled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const DISTANCE_OPTIONS = [
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "20 km", value: 20 },
  { label: "30 km", value: 30 },
  { label: "50 km", value: 50 },
  { label: "Any distance", value: 9999 },
];

export const CANONICAL_DISTANCE_PRESETS = [5, 10, 20, 30, 50];

export const USER_ROLES = {
  ADMIN: "admin",
  DONOR: "donor",
  RECIPIENT: "recipient",
};

// RBC Compatibility: Recipient needed blood group -> Eligible Donor blood groups
export const RBC_RECIPIENT_TO_DONOR_MAP = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

// Blood Group Compatibility Map (Donor can donate to...)
export const DONOR_COMPATIBILITY = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], // Universal Donor
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

export const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'];
