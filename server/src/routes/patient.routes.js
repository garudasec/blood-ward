import express from 'express';
import {
  claimPatientRecord,
  reissueClaimCode,
  requestFamilyAccess,
  updateFamilyAccess,
  getMyPatients,
  getPatientById,
} from '../controllers/patientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/claim', claimPatientRecord);
router.get('/me', getMyPatients);
router.get('/:id', getPatientById);
router.post('/:id/reissue-claim-code', reissueClaimCode);
router.post('/:id/family-access', requestFamilyAccess);
router.patch('/:id/family-access/:accessId', updateFamilyAccess);

export default router;
