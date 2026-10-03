import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import {
  isValidGeoCoordinates,
  isValidBloodGroup,
  isValidAvailability,
  isValidPincode,
} from "../utils/validators.js";
import {
  sanitizeDonorProfile,
  sanitizeDonorSearchResult,
} from "../utils/donorSanitizer.js";

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
    const { bloodGroup, state, city, pincode, fullName, phone, gender, availability, isAvailable } = req.body;

    if (availability !== undefined || isAvailable !== undefined) {
      const targetAvail = availability || (isAvailable !== undefined ? (isAvailable ? "available" : "not_available") : null);
      if (targetAvail && isValidAvailability(targetAvail)) {
        req.user.availability = targetAvail;
      }
    }

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return next(new AppError("Full Name must be a valid non-empty string.", 400));
      }
      req.user.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return next(new AppError("Phone number must be a valid non-empty string.", 400));
      }
      req.user.phone = phone.trim();
    }

    if (gender !== undefined) {
      if (gender !== "" && !["Male", "Female", "Other", "Prefer not to say"].includes(gender)) {
        return next(new AppError("Invalid gender value provided.", 400));
      }
      req.user.gender = gender ? gender.trim() : "";
    }

    if (bloodGroup !== undefined) {
      if (!isValidBloodGroup(bloodGroup)) {
        return next(
          new AppError(
            "Invalid blood group provided. Allowed values: A+, A-, B+, B-, AB+, AB-, O+, O-.",
            400
          )
        );
      }
      req.user.bloodGroup = bloodGroup;
    }

    if (state !== undefined) {
      if (typeof state !== "string") {
        return next(new AppError("State must be a valid text string.", 400));
      }
      req.user.state = state.trim();
    }

    if (city !== undefined) {
      if (typeof city !== "string") {
        return next(new AppError("City must be a valid text string.", 400));
      }
      req.user.city = city.trim();
    }

    if (pincode !== undefined) {
      if (!isValidPincode(pincode)) {
        return next(new AppError("Invalid pincode format.", 400));
      }
      req.user.pincode = typeof pincode === "string" ? pincode.trim() : "";
    }

    req.user.lastActiveAt = new Date();
    await req.user.save({ validateBeforeSave: true });

    res.status(200).json({
      success: true,
      message: "Donor profile updated successfully.",
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
    const { availability, isAvailable } = req.body;
    const targetAvailability = availability || (isAvailable !== undefined ? (isAvailable ? "available" : "not_available") : null);

    if (!targetAvailability || !isValidAvailability(targetAvailability)) {
      return next(
        new AppError('Availability must be either "available" or "not_available".', 400)
      );
    }

    req.user.availability = targetAvailability;
    req.user.lastActiveAt = new Date();

    await req.user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Donor availability status updated successfully.",
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
    const allowedQueryParams = ["bloodGroup", "latitude", "longitude", "radius", "location", "sort", "page", "limit"];
    for (const key of Object.keys(req.query)) {
      if (!allowedQueryParams.includes(key) || (typeof req.query[key] === "object" && req.query[key] !== null)) {
        return next(new AppError("Invalid or unrecognized query parameter: " + key, 400));
      }
    }

    const { bloodGroup, latitude, longitude, radius, location, sort = "nearest", page = 1, limit = 10 } = req.query;

    // Validate bloodGroup filter if supplied
    if (bloodGroup !== undefined && bloodGroup !== "") {
      if (typeof bloodGroup !== "string" || !isValidBloodGroup(bloodGroup)) {
        return next(new AppError("Invalid blood group filter provided.", 400));
      }
    }

    // Validate sort option
    const allowedSorts = ["nearest", "farthest", "recently_active"];
    if (typeof sort !== "string" || !allowedSorts.includes(sort)) {
      return next(
        new AppError("Invalid sort option. Allowed values: nearest, farthest, recently_active.", 400)
      );
    }

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);

    if (Number.isNaN(pageNum) || pageNum < 1) {
      return next(new AppError("Page number must be a positive integer.", 400));
    }
    if (Number.isNaN(limitNum) || limitNum < 1) {
      return next(new AppError("Limit must be a positive integer.", 400));
    }

    // Protection against excessive pagination limits
    if (limitNum > 50) {
      limitNum = 50;
    }

    const isAnyLocation = radius === "any" || location === "any";
    const hasCoordinates = latitude !== undefined && longitude !== undefined;
    const hasLocationParams = latitude !== undefined || longitude !== undefined || radius !== undefined || location !== undefined;

    let sanitizedDonors = [];
    let totalDocs = 0;

    const matchCriteria = {
      role: "donor",
      availability: "available",
      isBlocked: false,
    };

    if (bloodGroup && typeof bloodGroup === "string" && bloodGroup.trim() !== "") {
      matchCriteria.bloodGroup = bloodGroup.trim();
    }

    if (isAnyLocation) {
      if (hasCoordinates) {
        const lat = Number(latitude);
        const lng = Number(longitude);

        if (!isValidGeoCoordinates(lng, lat)) {
          return next(
            new AppError("Invalid coordinates. Longitude must be [-180, 180] and Latitude [-90, 90].", 400)
          );
        }

        const pipeline = [
          {
            $geoNear: {
              near: { type: "Point", coordinates: [lng, lat] },
              distanceField: "distanceMeters",
              query: matchCriteria,
              spherical: true,
            },
          },
        ];

        if (sort === "farthest") {
          pipeline.push({ $sort: { distanceMeters: -1 } });
        } else if (sort === "recently_active") {
          pipeline.push({ $sort: { lastActiveAt: -1 } });
        }

        const countPipeline = [...pipeline, { $count: "total" }];
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
        totalDocs = await User.countDocuments(matchCriteria);

        let sortOptions = { createdAt: -1 };
        if (sort === "recently_active") {
          sortOptions = { lastActiveAt: -1 };
        } else if (sort === "farthest") {
          sortOptions = { createdAt: 1 };
        }

        const skip = (pageNum - 1) * limitNum;
        const results = await User.find(matchCriteria).sort(sortOptions).skip(skip).limit(limitNum);

        sanitizedDonors = results.map((doc) => sanitizeDonorSearchResult(doc, null));
      }
    } else if (hasLocationParams) {
      if (latitude === undefined || longitude === undefined) {
        return next(new AppError("Both latitude and longitude parameters are required for location search.", 400));
      }

      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!isValidGeoCoordinates(lng, lat)) {
        return next(
          new AppError("Invalid coordinates. Longitude must be [-180, 180] and Latitude [-90, 90].", 400)
        );
      }

      const radiusKm = radius !== undefined ? Number(radius) : 10;
      if (Number.isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 500) {
        return next(new AppError("Radius must be a positive number between 0.1 and 500 kilometers.", 400));
      }

      const radiusMeters = radiusKm * 1000;

      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distanceMeters",
            maxDistance: radiusMeters,
            query: matchCriteria,
            spherical: true,
          },
        },
      ];

      if (sort === "farthest") {
        pipeline.push({ $sort: { distanceMeters: -1 } });
      } else if (sort === "recently_active") {
        pipeline.push({ $sort: { lastActiveAt: -1 } });
      }

      const countPipeline = [...pipeline, { $count: "total" }];
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
      totalDocs = await User.countDocuments(matchCriteria);

      let sortOptions = { createdAt: -1 };
      if (sort === "recently_active") {
        sortOptions = { lastActiveAt: -1 };
      }

      const skip = (pageNum - 1) * limitNum;
      const results = await User.find(matchCriteria).sort(sortOptions).skip(skip).limit(limitNum);

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
