import express from 'express';
import { getHospitals, getHospitalById } from '../controllers/hospitalController.js';

const router = express.Router();

router.get('/', getHospitals);
router.get('/:id', getHospitalById);

export default router;
