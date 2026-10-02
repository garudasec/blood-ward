export const sanitizeBloodRequest = (doc, userRole = null, userId = null) => {
  if (!doc) return null;

  const isOwner = userId && doc.recipient && (doc.recipient._id || doc.recipient).toString() === userId.toString();
  const isAcceptedDonor = userId && doc.acceptedDonor && (doc.acceptedDonor._id || doc.acceptedDonor).toString() === userId.toString();
  const isAdmin = userRole === 'admin';

  // Base fields visible to authorized participants
  const baseRequest = {
    id: doc._id,
    recipient: doc.recipient ? (doc.recipient._id || doc.recipient) : null,
    recipientName: doc.recipientName || (doc.recipient && doc.recipient.fullName) || 'Recipient',
    bloodGroup: doc.bloodGroup,
    unitsNeeded: doc.unitsNeeded,
    hospitalName: doc.hospitalName,
    city: doc.city,
    location: doc.location || null,
    urgency: doc.urgency,
    status: doc.status,
    requiredDate: doc.requiredDate,
    additionalNotes: doc.additionalNotes || '',
    donorResponsesCount: doc.donorResponsesCount || 0,
    acceptedDonor: doc.acceptedDonor ? (doc.acceptedDonor._id || doc.acceptedDonor) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (isOwner || isAcceptedDonor || isAdmin) {
    if (doc.acceptedDonor && typeof doc.acceptedDonor === 'object' && doc.acceptedDonor.fullName) {
      baseRequest.acceptedDonorDetails = {
        id: doc.acceptedDonor._id,
        fullName: doc.acceptedDonor.fullName,
        phone: doc.acceptedDonor.phone,
        bloodGroup: doc.acceptedDonor.bloodGroup,
        city: doc.acceptedDonor.city,
      };
    }
    return baseRequest;
  }

  // Sanitized view for donor request discovery
  return {
    id: doc._id,
    recipientName: doc.recipientName || 'Recipient',
    bloodGroup: doc.bloodGroup,
    unitsNeeded: doc.unitsNeeded,
    hospitalName: doc.hospitalName,
    city: doc.city,
    urgency: doc.urgency,
    status: doc.status,
    requiredDate: doc.requiredDate,
    additionalNotes: doc.additionalNotes || '',
    donorResponsesCount: doc.donorResponsesCount || 0,
    createdAt: doc.createdAt,
  };
};
