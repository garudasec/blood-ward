import dotenv from 'dotenv';
dotenv.config();
import assert from 'assert';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import BloodRequest from '../models/bloodRequest.js';
import { createBloodRequest } from '../controllers/bloodRequestController.js';
import { updateDonorProfile } from '../controllers/donorController.js';
import { registerDonor } from '../controllers/authController.js';
import connectDB from '../config/db.js';

export async function runLocationIntegrityTests() {
  console.log('\n=== LOCATION INTEGRITY TEST SUITE ===');
  await connectDB();

  let passCount = 0;
  const totalTests = 8;

  await User.deleteMany({ email: /@location_integrity_test\.com$/ });

  // Test A: Donor registration with fake coordinates
  {
    let statusCode = 0;
    let jsonResult = null;
    const mockRes = {
      status(c) { statusCode = c; return this; },
      cookie() { return this; },
      json(data) { jsonResult = data; return this; }
    };
    const mockNext = (err) => { if (err) { statusCode = err.statusCode || 500; jsonResult = { message: err.message }; } };

    const reqA = {
      ip: '127.0.0.1',
      body: {
        fullName: 'Fake Coords Donor',
        email: 'donor_fake_coords@location_integrity_test.com',
        phone: '9998887771',
        password: 'password123',
        bloodGroup: 'O+',
        state: 'Delhi',
        city: 'New Delhi',
        location: { type: 'Point', coordinates: [72.8777, 19.0760] }
      }
    };

    await registerDonor(reqA, mockRes, mockNext);
    assert.strictEqual(statusCode, 201, 'Test A failed');
    const createdDonor = await User.findOne({ email: 'donor_fake_coords@location_integrity_test.com' });
    assert.ok(createdDonor && createdDonor.location, 'Test A failed');
    assert.strictEqual(createdDonor.location.coordinates[0], 77.2090, 'Test A failed');
    assert.strictEqual(createdDonor.location.coordinates[1], 28.6139, 'Test A failed');
    console.log('[✅ PASS] Test A: Donor registration with fake coordinates ignores client coords and stores State+City location');
    passCount++;
  }

  // Test B: Donor profile update with fake coordinates
  {
    const donor = await User.findOne({ email: 'donor_fake_coords@location_integrity_test.com' });
    let statusCode = 0;
    let jsonResult = null;
    const mockRes = {
      status(c) { statusCode = c; return this; },
      json(data) { jsonResult = data; return this; }
    };
    const mockNext = (err) => { if (err) { statusCode = err.statusCode || 500; jsonResult = { message: err.message }; } };
    const reqB = {
      user: donor,
      body: {
        location: { type: 'Point', coordinates: [80.2707, 13.0827] }
      }
    };
    await updateDonorProfile(reqB, mockRes, mockNext);
    assert.strictEqual(statusCode, 200, 'Test B failed');
    const updatedDonor = await User.findById(donor._id);
    assert.strictEqual(updatedDonor.location.coordinates[0], 77.2090, 'Test B failed');
    assert.strictEqual(updatedDonor.location.coordinates[1], 28.6139, 'Test B failed');
    console.log('[✅ PASS] Test B: Donor profile update with fake coordinates cannot override city-derived location');
    passCount++;
  }

  // Test C: Existing donor State+City with missing location repaired on save
  {
    const donorC = await User.create({ fullName: 'Legacy Donor Missing Loc', email: 'legacy_donor@location_integrity_test.com', phone: '9998887772', password: 'password123', role: 'donor', bloodGroup: 'A+', state: 'Maharashtra', city: 'Mumbai' });
    await User.updateOne({ _id: donorC._id }, { $unset: { location: '' } });
    const stripped = await User.findById(donorC._id);
    assert.strictEqual(stripped.location, undefined, 'Test C setup failed');
    stripped.fullName = 'Legacy Donor Repaired';
    await stripped.save();
    const repaired = await User.findById(donorC._id);
    assert.ok(repaired.location && repaired.location.coordinates, 'Test C failed');
    assert.strictEqual(repaired.location.coordinates[0], 72.8777, 'Test C failed');
    assert.strictEqual(repaired.location.coordinates[1], 19.0760, 'Test C failed');
    console.log('[✅ PASS] Test C: Existing donor State+City with missing location is repaired on profile save');
    passCount++;
  }

  // Test D: Recipient request with valid State + City
  {
    const recipientD = await User.create({ fullName: 'Valid Recipient D', email: 'rec_d@location_integrity_test.com', phone: '9998887773', password: 'password123', role: 'recipient', state: 'Karnataka', city: 'Bengaluru' });
    let statusCode = 0;
    let jsonResult = null;
    const mockRes = { status(c) { statusCode = c; return this; }, json(data) { jsonResult = data; return this; } };
    const mockNext = (err) => { if (err) { statusCode = err.statusCode || 500; jsonResult = { message: err.message }; } };
    const reqD = { ip: '127.0.0.1', user: recipientD, body: { bloodGroup: 'O+', unitsNeeded: 2, hospitalName: 'Bangalore Hospital', urgency: 'Normal', requiredDate: '2026-12-31' } };
    await createBloodRequest(reqD, mockRes, mockNext);
    assert.strictEqual(statusCode, 201, 'Test D failed');
    assert.ok(jsonResult.request && jsonResult.request.location, 'Test D failed');
    assert.strictEqual(jsonResult.request.location.coordinates[0], 77.5946, 'Test D failed');
    assert.strictEqual(jsonResult.request.location.coordinates[1], 12.9716, 'Test D failed');
    console.log('[✅ PASS] Test D: Recipient request created with correct derived State+City coordinates');
    passCount++;
  }

  // Test E: Recipient request with missing State
  {
    const recipientE = await User.create({ fullName: 'No State Recipient E', email: 'rec_no_state@location_integrity_test.com', phone: '9998887774', password: 'password123', role: 'recipient', state: '', city: 'Delhi' });
    let statusCode = 0;
    let jsonResult = null;
    const mockRes = { status(c) { statusCode = c; return this; }, json(data) { jsonResult = data; return this; } };
    const mockNext = (err) => { if (err) { statusCode = err.statusCode || 500; jsonResult = { message: err.message }; } };
    const reqE = { user: recipientE, body: { bloodGroup: 'B+', unitsNeeded: 1, hospitalName: 'Delhi Hospital', urgency: 'Normal', requiredDate: '2026-12-31' } };
    await createBloodRequest(reqE, mockRes, mockNext);
    assert.strictEqual(statusCode, 400, 'Test E failed');
    console.log('[✅ PASS] Test E: Recipient request with missing State returns HTTP 400');
    passCount++;
  }

  // Test F: Recipient request with missing City
  {
    const recipientF = await User.create({ fullName: 'No City Recipient F', email: 'rec_no_city@location_integrity_test.com', phone: '9998887775', password: 'password123', role: 'recipient', state: 'Delhi', city: '' });
    let statusCode = 0;
    let jsonResult = null;
    const mockRes = { status(c) { statusCode = c; return this; }, json(data) { jsonResult = data; return this; } };
    const mockNext = (err) => { if (err) { statusCode = err.statusCode || 500; jsonResult = { message: err.message }; } };
    const reqF = { user: recipientF, body: { bloodGroup: 'B+', unitsNeeded: 1, hospitalName: 'Delhi Hospital', urgency: 'Normal', requiredDate: '2026-12-31' } };
    await createBloodRequest(reqF, mockRes, mockNext);
    assert.strictEqual(statusCode, 400, 'Test F failed');
    console.log('[✅ PASS] Test F: Recipient request with missing City returns HTTP 400');
    passCount++;
  }

  // Test G: Recipient request with malicious req.body.city
  {
    const recipientG = await User.create({ fullName: 'Profile Recipient G', email: 'rec_g@location_integrity_test.com', phone: '9998887776', password: 'password123', role: 'recipient', state: 'Delhi', city: 'New Delhi' });
    let statusCode = 0;
    let jsonResult = null;
    const mockRes = { status(c) { statusCode = c; return this; }, json(data) { jsonResult = data; return this; } };
    const mockNext = (err) => { if (err) { statusCode = err.statusCode || 500; jsonResult = { message: err.message }; } };
    const reqG = { user: recipientG, body: { bloodGroup: 'AB+', unitsNeeded: 1, hospitalName: 'City Hospital', city: 'Mumbai', urgency: 'Normal', requiredDate: '2026-12-31' } };
    await createBloodRequest(reqG, mockRes, mockNext);
    assert.strictEqual(statusCode, 201, 'Test G failed');
    const createdReq = await BloodRequest.findById(jsonResult.request._owner || jsonResult.request._id || jsonResult.request.id);
    assert.strictEqual(createdReq.city, 'New Delhi', 'Test G failed');
    assert.strictEqual(createdReq.location.coordinates[0], 77.2090, 'Test G failed');
    console.log('[✅ PASS] Test G: Recipient request with malicious req.body.city uses authenticated recipient profile location');
    passCount++;
  }

  // Test H: Recipient request with malicious req.body.location
  {
    const recipientH = await User.create({ fullName: 'Profile Recipient H', email: 'rec_h@location_integrity_test.com', phone: '9998887777', password: 'password123', role: 'recipient', state: 'Delhi', city: 'New Delhi' });
    let statusCode = 0;
    let jsonResult = null;
    const mockRes = { status(c) { statusCode = c; return this; }, json(data) { jsonResult = data; return this; } };
    const mockNext = (err) => { if (err) { statusCode = err.statusCode || 500; jsonResult = { message: err.message }; } };
    const reqH = { user: recipientH, body: { bloodGroup: 'O-', unitsNeeded: 1, hospitalName: 'City Hospital H', location: { type: 'Point', coordinates: [10.0, 10.0] }, urgency: 'Normal', requiredDate: '2026-12-31' } };
    await createBloodRequest(reqH, mockRes, mockNext);
    assert.strictEqual(statusCode, 201, 'Test H failed');
    const createdReq = await BloodRequest.findById(jsonResult.request._owner || jsonResult.request._id || jsonResult.request.id);
    assert.strictEqual(createdReq.location.coordinates[0], 77.2090, 'Test H failed');
    assert.strictEqual(createdReq.location.coordinates[1], 28.6139, 'Test H failed');
    console.log('[✅ PASS] Test H: Recipient request with malicious req.body.location ignores client coordinates');
    passCount++;
  }

  await User.deleteMany({ email: /@location_integrity_test\.com$/ });
  await BloodRequest.deleteMany({ hospitalName: /City Hospital H|Bangalore Hospital/ });

  console.log('\nFINAL RESULTS: ' + passCount + '/' + totalTests);
  if (process.argv[1] && process.argv[1].endsWith('run_location_integrity_tests.js')) {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith('run_location_integrity_tests.js')) {
  runLocationIntegrityTests().catch((err) => {
    console.error('Location Integrity Suite Error:', err);
    process.exit(1);
  });
}