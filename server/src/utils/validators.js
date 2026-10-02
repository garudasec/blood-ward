export const ALLOWED_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const ALLOWED_AVAILABILITY = ['available', 'not_available'];
export const ALLOWED_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const isValidGeoCoordinates = (longitude, latitude) => {
  const lng = Number(longitude);
  const lat = Number(latitude);
  return (
    !Number.isNaN(lng) &&
    !Number.isNaN(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

export const isValidBloodGroup = (bloodGroup) => {
  return typeof bloodGroup === 'string' && ALLOWED_BLOOD_GROUPS.includes(bloodGroup);
};

export const isValidAvailability = (availability) => {
  return typeof availability === 'string' && ALLOWED_AVAILABILITY.includes(availability);
};

export const isValidGender = (gender) => {
  if (gender === null || gender === undefined || gender === '') return true;
  return typeof gender === 'string' && ALLOWED_GENDERS.includes(gender);
};

export const isValidPincode = (pincode) => {
  if (pincode === null || pincode === undefined || pincode === '') return true;
  if (typeof pincode !== 'string') return false;
  // Standard Indian 6-digit pincode validation if present, or basic length check
  const trimmed = pincode.trim();
  return /^\d{6}$/.test(trimmed) || trimmed.length <= 10;
};
