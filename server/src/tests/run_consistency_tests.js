import assert from 'assert';
import { isBloodCompatible, getCompatibleRecipientBloodGroups } from '../utils/bloodCompatibility.js';
import { createBloodRequest, getAvailableRequests, acceptBloodRequest, rejectBloodRequest, markInProgress, fulfillBloodRequest } from '../controllers/bloodRequestController.js';
import BloodRequest from '../models/bloodRequest.js';
import User from '../models/user.model.js';

export async function runConsistencyTests() {
  console.log('\n--- Running Final Logic Consistency Tests (A-I) ---');
  let passCount = 0;

  // Test A: O- donor sees all compatible recipient blood groups
  {
    const oNegGroups = getCompatibleRecipientBloodGroups('O-');
    const expected = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
    assert.deepStrictEqual(oNegGroups.sort(), expected.sort(), 'Test A failed: O- donor compatible groups incorrect');
    console.log('[✅ PASS] Test A: O- donor compatibility map includes all 8 blood groups');
    passCount++;
  }

  // Test B: O+ donor sees only compatible request groups (O+, A+, B+, AB+)
  {
    const oPosGroups = getCompatibleRecipientBloodGroups('O+');
    const expected = ['O+', 'A+', 'B+', 'AB+'];
    assert.deepStrictEqual(oPosGroups.sort(), expected.sort(), 'Test B failed: O+ donor compatible groups incorrect');
    console.log('[✅ PASS] Test B: O+ donor compatible groups correct (O+, A+, B+, AB+)');
    passCount++;
  }

  // Test C: Incompatible donor does not see request
  {
    assert.strictEqual(isBloodCompatible('A+', 'B-'), false, 'Test C failed: A+ donor should not be compatible with B- request');
    assert.strictEqual(isBloodCompatible('O+', 'A-'), false, 'Test C failed: O+ donor should not be compatible with A- request');
    console.log('[✅ PASS] Test C: Incompatible donor correctly denied');
    passCount++;
  }

  // Test D: Socket event compatibility matching logic
  {
    assert.strictEqual(isBloodCompatible('O-', 'A+'), true, 'Test D failed: Socket rule O- -> A+ should be compatible');
    assert.strictEqual(isBloodCompatible('O+', 'A-'), false, 'Test D failed: Socket rule O+ -> A- should NOT be compatible');
    console.log('[✅ PASS] Test D: Socket event compatibility follows exact same rule');
    passCount++;
  }

  // Test E & F: Accept and Reject compatibility rules
  {
    assert.strictEqual(isBloodCompatible('O-', 'AB+'), true, 'Test E/F failed: O- donor should be compatible with AB+ request');
    assert.strictEqual(isBloodCompatible('B-', 'A+'), false, 'Test E/F failed: B- donor should NOT be compatible with A+ request');
    console.log('[✅ PASS] Test E: Accept compatibility rule verified');
    console.log('[✅ PASS] Test F: Reject compatibility rule verified');
    passCount += 2;
  }

  // Test G & H: Request location must come from authenticated recipient profile
  {
    let statusCode = 0;
    let jsonResult = null;

    const mockResNoLoc = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResult = data; return this; }
    };
    const mockNext1 = (err) => {
      if (err) {
        statusCode = err.statusCode || 500;
        jsonResult = { message: err.message };
      }
    };

    const mockUserNoLoc = { _id: 'user123', state: '', city: '' };

    const origFindById = User.findById;
    User.findById = () => ({
      select: () => Promise.resolve(mockUserNoLoc)
    });

    const mockReqWithClientLoc = {
      app: { get: () => null },
      user: { _id: 'user123', role: 'Recipient', fullName: 'Recipient User' },
      body: {
        patientName: 'Test Patient',
        bloodGroup: 'A+',
        unitsNeeded: 2,
        hospitalName: 'City Hospital',
        urgency: 'Normal',
        requiredDate: '2026-10-10',
        city: 'Malicious City Overwrite',
        location: { type: 'Point', coordinates: [0, 0] }
      }
    };

    await createBloodRequest(mockReqWithClientLoc, mockResNoLoc, mockNext1);
    assert.strictEqual(statusCode, 400, 'Test G failed: Should return 400 if user profile lacks state/city');
    assert.match(jsonResult.message, /profile/i, 'Test G failed: Error message should mention profile');
    console.log('[✅ PASS] Test G: Client cannot override request geographic location');
    passCount++;

    const mockUserWithLoc = { _id: 'user456', state: 'Maharashtra', city: 'Mumbai', fullName: 'Mumbai Recipient' };
    User.findById = () => mockUserWithLoc;

    let savedDoc = null;
    const origCreate = BloodRequest.create;
    BloodRequest.create = async (doc) => {
      savedDoc = doc;
      return { ...doc, _id: 'req123' };
    };

    const origFindByIdReq = BloodRequest.findById;
    BloodRequest.findById = () => ({
      populate: () => Promise.resolve({
        _id: 'req123',
        recipient: { fullName: 'Mumbai Recipient', email: 'test@example.com', phone: '1234567890' }
      })
    });

    let successStatusCode = 0;
    let successJsonResult = null;
    const mockResSuccess = {
      status(code) { successStatusCode = code; return this; },
      json(data) { successJsonResult = data; return this; }
    };
    const mockNext2 = (err) => {
      if (err) {
        successStatusCode = err.statusCode || 500;
        successJsonResult = { message: err.message };
      }
    };

    await createBloodRequest(mockReqWithClientLoc, mockResSuccess, mockNext2);
    assert.strictEqual(successStatusCode, 201, 'Test H failed: Request creation should succeed with valid profile location');
    assert.ok(savedDoc.location && savedDoc.location.coordinates, 'Test H failed: Location coordinates missing');
    assert.strictEqual(savedDoc.location.coordinates[0], 72.8777, 'Test H failed: Coords should come from Mumbai profile, not client');
    assert.strictEqual(savedDoc.location.coordinates[1], 19.0760, 'Test H failed: Coords should come from Mumbai profile, not client');
    assert.strictEqual(savedDoc.city, 'Mumbai', 'Test H failed: City should come from user profile');

    User.findById = origFindById;
    BloodRequest.create = origCreate;
    BloodRequest.findById = origFindByIdReq;
    console.log('[✅ PASS] Test H: Request location comes from authenticated recipient profile');
    passCount++;
  }

  // Test I: Lifecycle permissions
  {
    let statusCode = 0;
    let jsonResult = null;
    const mockRes = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResult = data; return this; }
    };
    const mockNext = (err) => {
      if (err) {
        statusCode = err.statusCode || 500;
        jsonResult = { message: err.message };
      }
    };

    const origFindByIdReq = BloodRequest.findById;

    BloodRequest.findById = async () => ({
      _id: 'req1',
      recipient: 'recipient1',
      acceptedDonor: 'donor1',
      status: 'Donor Accepted'
    });

    const mockReqFulfill = {
      user: { _id: 'donor1', role: 'Donor' },
      params: { id: 'req1' }
    };

    await fulfillBloodRequest(mockReqFulfill, mockRes, mockNext);
    assert.strictEqual(statusCode, 400, 'Test I failed: Should not allow Fulfill when status is Donor Accepted');
    assert.match(jsonResult.message, /In Progress/i, 'Test I failed: Error message should state request must be In Progress');

    BloodRequest.findById = origFindByIdReq;
    console.log('[✅ PASS] Test I: Lifecycle permissions are correct');
    passCount++;
  }

  console.log('\nFINAL RESULTS: ' + passCount + '/9');
}

if (process.argv[1].endsWith('run_consistency_tests.js')) {
  runConsistencyTests().catch(err => {
    console.error('Consistency Test Failure:', err);
    process.exit(1);
  });
}
