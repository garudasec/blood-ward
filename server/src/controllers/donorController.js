import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import {
  isValidGeoCoordinates,
  isValidBloodGroup,
  isValidAvailability,
  isValidPincode,
} from '../utils/validators.js';
import {
  sanitizeDonorProfile,
  sanitizeDonorSearchResult,
} from '../utils/donorSanitizer.js';

/**
 * @desc    Get current authenticated donor profile
 * @route   GET /api/donors/me
 * @access  Private (Donor only)
 */
export const getDonorProfile = async (req, res, next) => {
  try {
    const safeDonor = sanitizeDonorProfile(req.user);
    res.status(200).json({
      success: true,
      donor: safeDonor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current authenticated donor profile
 * @route   PUT /api/donors/me
 * @access  Private (Donor only)
 */
export const updateDonorProfile = async (req, res, next) => {
  try {
    const { fullName, phone, bloodGroup, city, pincode, location } = req.body;

    // Explicit allowlist updates to prevent mass assignment
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2) {
        return next(new AppError('Full name must be at least 2 characters long.', 400));
      }
      req.user.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim().length === 0) {
        return next(new AppError('Phone number cannot be empty.', 400));
      }
      req.user.phone = phone.trim();
    }

    if (bloodGroup !== undefined) {
      if (!isValidBloodGroup(bloodGroup)) {
        return next(new AppError('Invalid blood group provided.', 400));
      }
      req.user.bloodGroup = bloodGroup;
    }

    if (city !== undefined) {
      if (typeof city !== 'string') {
        return next(new AppError('City must be a valid text string.', 400));
      }
      req.user.city = city.trim();
    }

    if (pincode !== undefined) {
      if (!isValidPincode(pincode)) {
        return next(new AppError('Invalid pincode format.', 400));
      }
      req.user.pincode = typeof pincode === 'string' ? pincode.trim() : '';
    }

    if (location !== undefined) {
      if (location === null) {
        req.user.location = undefined;
      } else {
        if (
          typeof location !== 'object' ||
          location.type !== 'Point' ||
          !Array.isArray(location.coordinates) ||
          location.coordinates.length !== 2
        ) {
          return next(
            new AppError(
              'Location must be a GeoJSON Point format with coordinates [longitude, latitude].',
              400
            )
          );
        }

        const [longitude, latitude] = location.coordinates;
        if (!isValidGeoCoordinates(longitude, latitude)) {
          return next(
            new AppError(
              'Invalid GeoJSON coordinates. Longitude must be between -180 and 180, and Latitude between -90 and 90.',
              400
            )
          );
        }

        req.user.location = {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        };
      }
    }

    req.user.lastActiveAt = new Date();
    await req.user.save({ validateBeforeSave: true });

    res.status(200).json({
      success: true,
      message: 'Donor profile updated successfully.',
      donor: sanitizeDonorProfile(req.user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current authenticated donor availability status
 * @route   PATCH /api/donors/me/availability
 * @access  Private (Donor only)
 */
export const updateDonorAvailability = async (req, res, next) => {
  try {
    const { availability } = req.body;

    if (!availability || !isValidAvailability(availability)) {
      return next(
        new AppError('Availability must be either "available" or "not_available".', 400)
      );
    }

    req.user.availability = availability;
    req.user.lastActiveAt = new Date();

    await req.user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Donor availability status updated successfully.',
      availability: req.user.availability,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Recipient search for available donors with geospatial support
 * @route   GET /api/donors/search
 * @access  Private (Recipient only)
 */
export const searchDonors = async (req, res, next) => {
  try {
    // Strict query parameter allowlist to prevent query parameter and operator injection
    const allowedQueryParams = ['bloodGroup', 'latitude', 'longitude', 'radius', 'sort', 'page', 'limit'];
    for (const key of Object.keys(req.query)) {
      if (!allowedQueryParams.includes(key) || (typeof req.query[key] === 'object' && req.query[key] !== null)) {
        return next(new AppError(`Invalid or unrecognized query parameter: ${key}`, 400));
      }
    }

    const { bloodGroup, latitude, longitude, radius, sort = 'nearest', page = 1, limit = 10 } = req.query;

    // Validate bloodGroup filter if supplied
    if (bloodGroup !== undefined && bloodGroup !== '') {
      if (typeof bloodGroup !== 'string' || !isValidBloodGroup(bloodGroup)) {
        return next(new AppError('Invalid blood group filter provided.', 400));
      }
    }

    // Validate sort option
    const allowedSorts = ['nearest', 'farthest', 'recently_active'];
    if (typeof sort !== 'string' || !allowedSorts.includes(sort)) {
      return next(
        new AppError('Invalid sort option. Allowed values: nearest, farthest, recently_active.', 400)
      );
    }

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);

    if (Number.isNaN(pageNum) || pageNum < 1) {
      return next(new AppError('Page number must be a positive integer.', 400));
    }
    if (Number.isNaN(limitNum) || limitNum < 1) {
      return next(new AppError('Limit must be a positive integer.', 400));
    }

    // Protection against excessive pagination limits
    if (limitNum > 50) {
      limitNum = 50;
    }

    const hasLocation = latitude !== undefined || longitude !== undefined || radius !== undefined;

    let sanitizedDonors = [];
    let totalDocs = 0;

    if (hasLocation) {
      // Both latitude and longitude are mandatory for geospatial search
      if (latitude === undefined || longitude === undefined) {
        return next(new AppError('Both latitude and longitude parameters are required for location search.', 400));
      }

      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!isValidGeoCoordinates(lng, lat)) {
        return next(
          new AppError('Invalid coordinates. Longitude must be [-180, 180] and Latitude [-90, 90].', 400)
        );
      }

      const radiusKm = radius !== undefined ? Number(radius) : 10;
      if (Number.isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 500) {
        return next(new AppError('Radius must be a positive number between 0.1 and 500 kilometers.', 400));
      }

      const radiusMeters = radiusKm * 1000;

      // Base criteria ensuring mandatory filters (only available, unblocked donors)
      const matchCriteria = {
        role: 'donor',
        availability: 'available',
        isBlocked: false,
      };

      if (bloodGroup && typeof bloodGroup === 'string' && bloodGroup.trim() !== '') {
        matchCriteria.bloodGroup = bloodGroup.trim();
      }

      const pipeline = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceMeters',
            maxDistance: radiusMeters,
            query: matchCriteria,
            spherical: true,
          },
        },
      ];

      if (sort === 'farthest') {
        pipeline.push({ $sort: { distanceMeters: -1 } });
      } else if (sort === 'recently_active') {
        pipeline.push({ $sort: { lastActiveAt: -1 } });
      }
      // Note: default for 'nearest' is distanceMeters ascending from $geoNear

      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await User.aggregate(countPipeline);
      totalDocs = countResult.length > 0 ? countResult[0].total : 0;

      const skip = (pageNum - 1) * limitNum;
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });

      const results = await User.aggregate(pipeline);

      sanitizedDonors = results.map((doc) =>
        sanitizeDonorSearchResult(doc, doc.distanceMeters / 1000)
      );
    } else {
      // Standard non-geospatial search
      const query = {
        role: 'donor',
        availability: 'available',
        isBlocked: false,
      };

      if (bloodGroup && typeof bloodGroup === 'string' && bloodGroup.trim() !== '') {
        query.bloodGroup = bloodGroup.trim();
      }

      totalDocs = await User.countDocuments(query);

      let sortOptions = { createdAt: -1 };
      if (sort === 'recently_active') {
        sortOptions = { lastActiveAt: -1 };
      }

      const skip = (pageNum - 1) * limitNum;
      const results = await User.find(query).sort(sortOptions).skip(skip).limit(limitNum);

      sanitizedDonors = results.map((doc) => sanitizeDonorSearchResult(doc, null));
    }

    const totalPages = Math.ceil(totalDocs / limitNum) || 1;

    res.status(200).json({
      success: true,
      count: sanitizedDonors.length,
      total: totalDocs,
      page: pageNum,
      totalPages,
      donors: sanitizedDonors,
    });
  } catch (error) {
    next(error);
  }
};
