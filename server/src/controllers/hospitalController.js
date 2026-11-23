import Hospital from '../models/hospital.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';

/**
 * @desc    Get list of verified hospitals (with optional search)
 * @route   GET /api/hospitals
 * @access  Public
 */
export const getHospitals = async (req, res, next) => {
  try {
    const { search, city, state } = req.query;
    const query = { verificationStatus: 'verified' };

    if (city && typeof city === 'string' && city.trim()) {
      query.city = { $regex: city.trim(), $options: 'i' };
    }

    if (state && typeof state === 'string' && state.trim()) {
      query.state = { $regex: state.trim(), $options: 'i' };
    }

    if (search && typeof search === 'string' && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const hospitals = await Hospital.find(query).sort({ name: 1 }).limit(100);

    res.status(200).json({
      success: true,
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get hospital details by ID
 * @route   GET /api/hospitals/:id
 * @access  Public
 */
export const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return next(new AppError('Hospital entity not found.', 404));
    }

    res.status(200).json({
      success: true,
      hospital,
    });
  } catch (error) {
    next(error);
  }
};
