export const sanitizeDonorProfile = (user) => {
  if (!user) return null;
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    bloodGroup: user.bloodGroup || null,
    availability: user.availability || 'not_available',
    city: user.city || '',
    pincode: user.pincode || '',
    location: user.location || null,
    lastActiveAt: user.lastActiveAt,
    createdAt: user.createdAt,
  };
};

export const sanitizeDonorSearchResult = (doc, distanceKm) => {
  if (!doc) return null;
  
  let formattedDistance = null;
  if (typeof distanceKm === 'number' && !Number.isNaN(distanceKm)) {
    formattedDistance = parseFloat(distanceKm.toFixed(1));
  }

  return {
    id: doc._id,
    fullName: doc.fullName,
    bloodGroup: doc.bloodGroup || null,
    availability: doc.availability || 'available',
    city: doc.city || '',
    distanceKm: formattedDistance,
    lastActiveAt: doc.lastActiveAt,
  };
};
