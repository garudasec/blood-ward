import Counter from '../models/counter.model.js';

export const generateId = async (counterKey, prefix, digits = 6) => {
  const counter = await Counter.findByIdAndUpdate(
    counterKey,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(digits, '0')}`;
};

export const generateHospitalId = () => generateId('hospitalId', 'BW-HSP', 6);
export const generatePatientId = () => generateId('patientId', 'BW-PAT', 6);
export const generateComplaintId = () => generateId('complaintId', 'BW-CMP', 6);
export const generateRequestId = () => generateId('requestId', 'BW-REQ', 6);
