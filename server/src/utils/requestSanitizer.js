const formatRequiredDate = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(parsed);
  }
  return str;
};

export const sanitizeBloodRequest = (doc, userRole = null, userId = null) => {
  if (!doc) return null;

  const isOwner = userId && doc.recipient && (doc.recipient._id || doc.recipient).toString() === userId.toString();
  const isAcceptedDonor = userId && doc.acceptedDonor && (doc.acceptedDonor._id || doc.acceptedDonor).toString() === userId.toString();
  const isAdmin = userRole === 'admin';

  const normalizedRequiredDate = formatRequiredDate(doc.requiredDate);

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
    requiredDate: normalizedRequiredDate,
    radiusKm: doc.radiusKm || 20,
    additionalNotes: doc.additionalNotes || '',
    donorResponsesCount: doc.donorResponsesCount || 0,
    acceptedDonor: doc.acceptedDonor ? (doc.acceptedDonor._id || doc.acceptedDonor) : null,
    hospital: doc.hospital ? (doc.hospital._id || doc.hospital) : null,
    patient: doc.patient ? (doc.patient._id || doc.patient) : null,
    patientDetails: doc.patientDetails || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (isOwner || isAcceptedDonor || isAdmin) {
    if (doc.recipient && typeof doc.recipient === 'object' && doc.recipient.phone) {
      if (['Donor Accepted', 'In Progress', 'Fulfilled'].includes(doc.status)) {
        baseRequest.recipientPhone = doc.recipient.phone;
        baseRequest.recipientDetails = {
          id: doc.recipient._id,
          fullName: doc.recipient.fullName,
          phone: doc.recipient.phone,
          city: doc.recipient.city,
        };
      }
    }

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
    requiredDate: normalizedRequiredDate,
    radiusKm: doc.radiusKm || 20,
    additionalNotes: doc.additionalNotes || '',
    donorResponsesCount: doc.donorResponsesCount || 0,
    createdAt: doc.createdAt,
  };
};
