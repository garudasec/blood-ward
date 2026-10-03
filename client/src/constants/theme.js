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
  { label: "2 km", value: 2 },
  { label: "5 km", value: 5 },
  { label: "7 km", value: 7 },
  { label: "10 km", value: 10 },
  { label: "20 km", value: 20 },
  { label: "Any distance", value: 9999 },
];

export const USER_ROLES = {
  ADMIN: "admin",
  DONOR: "donor",
  RECIPIENT: "recipient",
};

// Blood Group Compatibility Map
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

export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
