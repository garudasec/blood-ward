import './testDb.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';
import Patient from '../models/patient.model.js';
import Complaint from '../models/complaint.model.js';
import AuditLog from '../models/auditLog.js';

import authRouter from '../routes/auth.routes.js';
import adminRouter from '../routes/admin.routes.js';
import complaintRouter from '../routes/complaint.routes.js';

import notFoundHandler from '../middleware/notFoundMiddleware.js';
import errorHandler from '../middleware/errorMiddleware.js';
import sanitizeMiddleware from '../middleware/sanitizeMiddleware.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/complaints', complaintRouter);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
let baseUrl;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[✅ PASS] ${message}`);
    passed++;
  } else {
    console.error(`[❌ FAIL] ${message}`);
    failed++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, headers: response.headers };
}

async function runTests() {
  console.log('==================================================');
  console.log('PUBLIC COMPLAINTS SYSTEM TEST SUITE');
  console.log('==================================================\n');

  try {
    await connectDB();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Clean up test data
    await User.deleteMany({ email: /@test-public-complaints\.com$/i });
    await Hospital.deleteMany({ hospitalId: /^BW-HSP-PUB/i });
    await Patient.deleteMany({ patientId: /^BW-PAT-PUB/i });
    await Complaint.deleteMany({ complaintId: /^BW-CMP-/i });

    // Seed test hospital 1
    const hospital1 = await Hospital.create({
      hospitalId: 'BW-HSP-PUB001',
      name: 'City Care Hospital Apex',
      address: '101 Healthcare Way',
      city: 'Mumbai',
      state: 'Maharashtra',
      contactPhone: '9876500001',
      verificationStatus: 'verified',
    });

    // Seed test hospital 2 (unassociated with patient 1)
    const hospital2 = await Hospital.create({
      hospitalId: 'BW-HSP-PUB002',
      name: 'Metro General Hospital',
      address: '202 Hospital Road',
      city: 'Delhi',
      state: 'Delhi',
      contactPhone: '9876500002',
      verificationStatus: 'verified',
    });

    // Seed test patient 1 associated with hospital 1
    const patient1 = await Patient.create({
      patientId: 'BW-PAT-PUB001',
      name: 'Ramesh Sharma',
      age: 45,
      gender: 'Male',
      bloodGroup: 'B+',
      hospital: hospital1._id,
      hospitalRegistrationNumber: 'REG-H1-4421',
      contactPhone: '9876500011',
    });

    // Seed Admin user for admin inspection
    const adminUser = await User.create({
      fullName: 'Chief Complaints Inspector',
      email: 'admin@test-public-complaints.com',
      password: 'AdminPassword123!',
      role: 'admin',
      phone: '9876500099',
    });

    // Login as admin
    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@test-public-complaints.com',
        password: 'AdminPassword123!',
      }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie');
    assert(adminLoginRes.status === 200, 'Admin login succeeded');

    console.log('\n--- 1. Unauthenticated Public Complaint Submission ---');
    const validPublicSubmission = await request('/api/complaints/public', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'BW-PAT-PUB001',
        hospitalId: 'BW-HSP-PUB001',
        category: 'Suspected diversion of donated blood',
        description: 'Blood units confirmed accepted by donor were never provided to patient Ramesh Sharma in Ward 4.',
        contactEmail: 'witness@example.com',
      }),
    });

    assert(validPublicSubmission.status === 201, 'Public complaint submitted successfully (HTTP 201)');
    assert(validPublicSubmission.data.success === true, 'Response indicates success: true');
    assert(typeof validPublicSubmission.data.complaintReferenceId === 'string', 'Generated complaintReferenceId returned');
    assert(validPublicSubmission.data.complaintReferenceId.startsWith('BW-CMP-'), 'Reference ID formatted correctly (BW-CMP-XXXXXX)');
    assert(validPublicSubmission.data.status === 'Pending', 'Initial complaint status is Pending');

    const createdRecord = await Complaint.findOne({ complaintId: validPublicSubmission.data.complaintReferenceId });
    assert(createdRecord !== null, 'Complaint persisted in MongoDB database');
    assert(createdRecord.complainant === null, 'Public complaint complainant field is null');
    assert(createdRecord.complainantType === 'public', 'complainantType is public');
    assert(createdRecord.bloodRequest === null, 'bloodRequest is null');
    assert(createdRecord.contactEmail === 'witness@example.com', 'contactEmail stored accurately');
    assert(createdRecord.status === 'Pending', 'Persisted status is Pending');

    console.log('\n--- 2. Anti-Enumeration Security & Identifier Verification ---');
    const GENERIC_ERROR_MSG = 'Invalid Patient ID, Hospital ID, or hospital association. Please verify your identifiers.';

    // Non-existent Patient ID
    const badPatientRes = await request('/api/complaints/public', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'BW-PAT-DOESNOTEXIST',
        hospitalId: 'BW-HSP-PUB001',
        description: 'Reporting misconduct regarding an unknown patient identifier probe.',
      }),
    });
    assert(badPatientRes.status === 400, 'Non-existent Patient ID returns HTTP 400');
    assert(badPatientRes.data.message === GENERIC_ERROR_MSG, 'Anti-enumeration generic error returned for invalid patient');

    // Non-existent Hospital ID
    const badHospitalRes = await request('/api/complaints/public', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'BW-PAT-PUB001',
        hospitalId: 'BW-HSP-DOESNOTEXIST',
        description: 'Reporting misconduct regarding an unknown hospital facility identifier probe.',
      }),
    });
    assert(badHospitalRes.status === 400, 'Non-existent Hospital ID returns HTTP 400');
    assert(badHospitalRes.data.message === GENERIC_ERROR_MSG, 'Anti-enumeration generic error returned for invalid hospital');

    // Mismatched Patient and Hospital association
    const mismatchRes = await request('/api/complaints/public', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'BW-PAT-PUB001',
        hospitalId: 'BW-HSP-PUB002', // Hospital 2 exists, but patient 1 is admitted at Hospital 1
        description: 'Reporting misconduct with mismatched patient and hospital association.',
      }),
    });
    assert(mismatchRes.status === 400, 'Mismatched Patient-Hospital association returns HTTP 400');
    assert(mismatchRes.data.message === GENERIC_ERROR_MSG, 'Anti-enumeration generic error returned for association mismatch');

    console.log('\n--- 3. Field Validation & Input Sanitization ---');
    // Description too short (< 20 characters)
    const shortDescRes = await request('/api/complaints/public', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'BW-PAT-PUB001',
        hospitalId: 'BW-HSP-PUB001',
        description: 'Too short',
      }),
    });
    assert(shortDescRes.status === 400, 'Description < 20 chars rejected with HTTP 400');

    // Missing Patient ID
    const missingPatientRes = await request('/api/complaints/public', {
      method: 'POST',
      body: JSON.stringify({
        hospitalId: 'BW-HSP-PUB001',
        description: 'Valid length description but missing mandatory patient identifier field.',
      }),
    });
    assert(missingPatientRes.status === 400, 'Missing Patient ID rejected with HTTP 400');

    // Missing Hospital ID
    const missingHospitalRes = await request('/api/complaints/public', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'BW-PAT-PUB001',
        description: 'Valid length description but missing mandatory hospital identifier field.',
      }),
    });
    assert(missingHospitalRes.status === 400, 'Missing Hospital ID rejected with HTTP 400');

    // Invalid email format
    const badEmailRes = await request('/api/complaints/public', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'BW-PAT-PUB001',
        hospitalId: 'BW-HSP-PUB001',
        description: 'Valid length description with a malformed email address in the contact email field.',
        contactEmail: 'not-an-email',
      }),
    });
    assert(badEmailRes.status === 400, 'Malformed contact email rejected with HTTP 400');

    console.log('\n--- 4. Administrative Investigation Lifecycle ---');
    // Admin lists complaints with status filter "Pending"
    const adminListPending = await request('/api/admin/complaints?status=Pending', {
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    assert(adminListPending.status === 200, 'Admin can list Pending complaints');
    assert(adminListPending.data.complaints.some((c) => c.complaintId === validPublicSubmission.data.complaintReferenceId), 'Public complaint visible in admin Pending list');

    // Admin transitions status from Pending to Under Review
    const updateStatusRes = await request(`/api/admin/complaints/${createdRecord._id}/status`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        status: 'Under Review',
        note: 'Assigned to senior clinical ombudsman for initial document review.',
      }),
    });
    assert(updateStatusRes.status === 200, 'Admin can transition Pending complaint to Under Review');

    // Admin resolves complaint
    const resolveRes = await request(`/api/admin/complaints/${createdRecord._id}/resolve`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie },
      body: JSON.stringify({
        status: 'Resolved',
        resolutionReason: 'Investigation confirmed inventory discrepancy was rectified and patient received required care.',
        note: 'Hospital compliance team reprimanded; corrective action plan submitted.',
      }),
    });
    assert(resolveRes.status === 200, 'Admin can resolve public complaint');
    assert(resolveRes.data.complaint.status === 'Resolved', 'Complaint status updated to Resolved');
    assert(resolveRes.data.complaint.resolvedBy !== null, 'resolvedBy recorded');

    console.log('\n--- 5. Audit Logging ---');
    const auditRecord = await AuditLog.findOne({
      action: 'SUBMIT_PUBLIC_COMPLAINT',
      target: createdRecord._id.toString(),
    });
    assert(auditRecord !== null, 'Audit log created for SUBMIT_PUBLIC_COMPLAINT');
    assert(auditRecord.category === 'RECIPIENT_ACTION', 'Audit log category is RECIPIENT_ACTION');

    console.log('\n==================================================');
    console.log(`FINAL RESULTS: ${passed}/${passed + failed}`);
    console.log(`TOTAL PASS: ${passed}`);
    console.log(`TOTAL FAIL: ${failed}`);
    console.log('==================================================');

  } catch (err) {
    console.error('Unhandled test suite error:', err);
    failed++;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
