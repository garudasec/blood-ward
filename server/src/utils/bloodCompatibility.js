/**
 * Authoritative Blood-Group Compatibility Map & Utility
 * Defines donor-to-recipient blood compatibility rules for BloodWard.
 */

export const DONOR_TO_RECIPIENT_MAP = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/**
 * Returns array of compatible recipient request blood groups for a given donor blood group.
 * @param {string} donorBloodGroup
 * @returns {string[]}
 */
export const getCompatibleRecipientBloodGroups = (donorBloodGroup) => {
  if (!donorBloodGroup || typeof donorBloodGroup !== 'string') return [];
  const normalized = donorBloodGroup.trim();
  return DONOR_TO_RECIPIENT_MAP[normalized] ? [...DONOR_TO_RECIPIENT_MAP[normalized]] : [];
};

/**
 * Checks whether a donor blood group is compatible with a recipient request blood group.
 * @param {string} donorBloodGroup
 * @param {string} recipientBloodGroup
 * @returns {boolean}
 */
export const isBloodCompatible = (donorBloodGroup, recipientBloodGroup) => {
  if (!donorBloodGroup || !recipientBloodGroup) return false;
  const compatibleList = getCompatibleRecipientBloodGroups(donorBloodGroup);
  return compatibleList.includes(recipientBloodGroup.trim());
};
