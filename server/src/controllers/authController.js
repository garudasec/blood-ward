import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Hospital from "../models/hospital.model.js";
import AppError from "../utils/appError.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import { generateHospitalId } from "../utils/idGenerator.js";
import { ALLOWED_GENDERS, isValidPincode, normalizeIndianPhone, validateDonorDOB } from "../utils/validators.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";
import { notifyAdminsOfNewDonor, notifyAdminsOfNewRecipient } from "../services/adminNotificationService.js";

const signToken = (id, role, tokenVersion = 0) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing from environment configuration");
  }
  return jwt.sign({ id, role, tokenVersion }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const token = signToken(user._id, user.role, user.tokenVersion || 0);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("token", token, cookieOptions);

  const safeUser = {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    gender: user.gender || "",
    bloodGroup: user.bloodGroup || null,
    state: user.state || "",
    city: user.city || "",
    pincode: user.pincode || "",
    availability: user.availability || "not_available",
    isBlocked: user.isBlocked || false,
    dateOfBirth: user.dateOfBirth || "",
    healthQuestionnaire: user.role === "donor" ? (user.healthQuestionnaire || {}) : undefined,
    accountType: user.accountType || "individual",
    hospitalName: user.hospitalName || "",
    hospitalAddress: user.hospitalAddress || "",
    hospitalContactPhone: user.hospitalContactPhone || "",
    representativeDesignation: user.representativeDesignation || "",
    authorizationNotes: user.authorizationNotes || "",
    verificationStatus: user.verificationStatus || (user.accountType === "hospital_rep" ? "pending" : "verified"),
    verificationRejectionReason: user.verificationRejectionReason || "",
    verifiedAt: user.verifiedAt || null,
    hospital: user.hospital || null,
    isEmailVerified: user.isEmailVerified || false,
    emailVerifiedAt: user.emailVerifiedAt || null,
    isPhoneVerified: user.isPhoneVerified || false,
    phoneVerifiedAt: user.phoneVerifiedAt || null,
  };

  res.status(statusCode).json({
    success: true,
    message,
    user: safeUser,
  });
};

export const registerDonor = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      gender,
      password,
      bloodGroup,
      state,
      city,
      pincode,
      dateOfBirth,
      healthQuestionnaire,
      isAvailable,
      availability,
    } = req.body;

    if (!fullName || !email || !phone || !password || !bloodGroup) {
      return next(new AppError("Full Name, Email, Phone, Password, and Blood Group are required for donor registration.", 400));
    }

    // Date of Birth is mandatory for voluntary donor registration
    const dobValidation = validateDonorDOB(dateOfBirth);
    if (!dobValidation.isValid) {
      return next(new AppError(dobValidation.message, 400));
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      return next(new AppError("Please provide a valid 10-digit Indian mobile number.", 400));
    }

    if (gender !== undefined && gender !== "" && !ALLOWED_GENDERS.includes(gender)) {
      return next(new AppError("Invalid gender value provided.", 400));
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError("An account with this email address already exists.", 400));
    }

    let donorAvailability = "not_available";
    if (availability === "available" || isAvailable === true || isAvailable === "true") {
      donorAvailability = "available";
    }

    const donorData = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      gender: gender ? gender.trim() : "",
      password,
      role: "donor",
      bloodGroup,
      state: state ? state.trim() : "",
      city: city ? city.trim() : "",
      pincode: pincode ? pincode.trim() : "",
      dateOfBirth: dateOfBirth ? String(dateOfBirth).trim() : "",
      availability: donorAvailability,
      isEmailVerified: false,
      emailVerifiedAt: null,
    };

    if (healthQuestionnaire && typeof healthQuestionnaire === "object") {
      donorData.healthQuestionnaire = {
        currentWeight: healthQuestionnaire.currentWeight ? Number(healthQuestionnaire.currentWeight) : null,
        medicalConditions: healthQuestionnaire.medicalConditions ? String(healthQuestionnaire.medicalConditions).trim() : "",
        medications: healthQuestionnaire.medications ? String(healthQuestionnaire.medications).trim() : "",
        recentIllnessOrFever: Boolean(healthQuestionnaire.recentIllnessOrFever),
        recentSurgery: Boolean(healthQuestionnaire.recentSurgery),
        previousDonation: Boolean(healthQuestionnaire.previousDonation),
        lastDonationDate: healthQuestionnaire.lastDonationDate ? String(healthQuestionnaire.lastDonationDate).trim() : "",
        additionalNotes: healthQuestionnaire.additionalNotes ? String(healthQuestionnaire.additionalNotes).trim() : "",
        updatedAt: new Date(),
      };
    }

    const newUser = await User.create(donorData);

    logAuditEvent({
      actor: newUser._id,
      actorName: newUser.fullName,
      action: "REGISTER_DONOR",
      category: "AUTH",
      target: newUser._id.toString(),
      ipAddress: req.ip,
      severity: "NORMAL",
    });

    notifyAdminsOfNewDonor(newUser).catch((err) => {
      console.warn("[AuthController] Admin notification error on donor registration:", err.message);
    });

    sendTokenResponse(newUser, 201, res, "Donor registration successful.");
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("An account with this email address already exists.", 400));
    }
    next(error);
  }
};

export const registerRecipient = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      gender,
      password,
      location,
      state,
      city,
      accountType = "individual",
      hospitalName,
      hospitalAddress,
      hospitalContactPhone,
      representativeDesignation,
      authorizationNotes,
    } = req.body;

    if (!fullName || !email || !phone || !password) {
      return next(new AppError("Full Name, Email, Phone, and Password are required for recipient registration.", 400));
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      return next(new AppError("Please provide a valid 10-digit Indian mobile number.", 400));
    }

    if (gender !== undefined && gender !== "" && !ALLOWED_GENDERS.includes(gender)) {
      return next(new AppError("Invalid gender value provided.", 400));
    }

    const isHospitalRep = accountType === "hospital_rep";
    if (isHospitalRep) {
      if (!hospitalName || typeof hospitalName !== "string" || !hospitalName.trim()) {
        return next(new AppError("Hospital or medical centre name is required for hospital representative registration.", 400));
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError("An account with this email address already exists.", 400));
    }

    const recipientCity = (location || city || "").trim();

    let linkedHospitalId = null;
    if (isHospitalRep) {
      const trimmedHospitalName = hospitalName.trim();
      const escapedHospitalName = trimmedHospitalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedCity = recipientCity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      let existingHospital = await Hospital.findOne({
        name: { $regex: new RegExp(`^${escapedHospitalName}$`, "i") },
        city: { $regex: new RegExp(`^${escapedCity}$`, "i") },
      });

      if (!existingHospital) {
        const hospitalId = await generateHospitalId();
        existingHospital = await Hospital.create({
          hospitalId,
          name: trimmedHospitalName,
          address: hospitalAddress ? hospitalAddress.trim() : "",
          city: recipientCity,
          state: state ? state.trim() : "",
          contactPhone: hospitalContactPhone ? hospitalContactPhone.trim() : "",
          verificationStatus: "pending",
        });
      }

      linkedHospitalId = existingHospital._id;
    }

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      gender: gender ? gender.trim() : "",
      password,
      role: "recipient",
      state: state ? state.trim() : "",
      city: recipientCity,
      accountType: isHospitalRep ? "hospital_rep" : "individual",
      hospital: linkedHospitalId,
      hospitalName: isHospitalRep ? hospitalName.trim() : "",
      hospitalAddress: isHospitalRep && hospitalAddress ? hospitalAddress.trim() : "",
      hospitalContactPhone: isHospitalRep && hospitalContactPhone ? hospitalContactPhone.trim() : "",
      representativeDesignation: isHospitalRep && representativeDesignation ? representativeDesignation.trim() : "",
      authorizationNotes: isHospitalRep && authorizationNotes ? authorizationNotes.trim() : "",
      verificationStatus: isHospitalRep ? "pending" : "verified",
      isPhoneVerified: false,
      phoneVerifiedAt: null,
      isEmailVerified: false,
      emailVerifiedAt: null,
    });

    logAuditEvent({
      actor: newUser._id,
      actorName: newUser.fullName,
      action: isHospitalRep ? "REGISTER_HOSPITAL_REPRESENTATIVE" : "REGISTER_RECIPIENT",
      category: "AUTH",
      target: newUser._id.toString(),
      ipAddress: req.ip,
      severity: "NORMAL",
      details: isHospitalRep ? `Hospital representative registered for ${hospitalName.trim()} (Pending Verification).` : "Individual recipient registered.",
    });

    notifyAdminsOfNewRecipient(newUser, isHospitalRep, isHospitalRep ? hospitalName.trim() : "").catch((err) => {
      console.warn("[AuthController] Admin notification error on recipient registration:", err.message);
    });

    sendTokenResponse(newUser, 201, res, isHospitalRep ? "Hospital representative registration submitted. Account is pending verification." : "Recipient registration successful.");
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("An account with this email address already exists.", 400));
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, role: requestedRole } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide both email address and password.", 400));
    }

    const ALLOWED_ROLES = ["admin", "donor", "recipient"];
    if (requestedRole !== undefined && !ALLOWED_ROLES.includes(requestedRole)) {
      return next(new AppError("Invalid role requested.", 400));
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return next(new AppError("Invalid login credentials", 401));
    }

    if (user.isBlocked) {
      logAuditEvent({
        actor: user._id,
        actorName: user.fullName,
        action: "BLOCKED_LOGIN_ATTEMPT",
        category: "SECURITY",
        target: user.email,
        ipAddress: req.ip,
        severity: "HIGH",
      });
      return next(new AppError("Your account has been blocked by system administration.", 403));
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return next(new AppError("Invalid login credentials", 401));
    }

    if (requestedRole && requestedRole !== user.role) {
      const roleDisplayNames = {
        admin: "Admin",
        donor: "Donor",
        recipient: "Recipient",
      };
      const actualRoleLabel = roleDisplayNames[user.role] || user.role;
      return next(
        new AppError(
          `This account is registered as a ${actualRoleLabel}. Please select ${actualRoleLabel} login.`,
          403
        )
      );
    }

    user.lastActiveAt = new Date();
    await user.save({ validateBeforeSave: false });

    logAuditEvent({
      actor: user._id,
      actorName: user.fullName,
      action: "LOGIN_SUCCESS",
      category: "AUTH",
      target: user.email,
      ipAddress: req.ip,
      severity: "NORMAL",
    });

    sendTokenResponse(user, 200, res, "Logged in successfully.");
  } catch (error) {
    next(error);
  }
};
export const logout = async (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now() + 1000),
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  if (req.user) {
    logAuditEvent({
      actor: req.user._id,
      actorName: req.user.fullName,
      action: "LOGOUT",
      category: "AUTH",
      target: req.user.email,
      ipAddress: req.ip,
      severity: "NORMAL",
    });
  }

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

export const getMe = async (req, res, next) => {
  try {
    let currentUser = req.user;

    if (!currentUser) {
      let token = req.cookies?.token;

      if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
      }

      if (!token || token === "logout" || token === "null" || token === "undefined") {
        return res.status(200).json({
          success: true,
          authenticated: false,
          user: null,
        });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new AppError("Server authentication misconfigured.", 500));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, secret);
      } catch {
        // Expired or invalid token: return clean unauthenticated status without raising 401
        return res.status(200).json({
          success: true,
          authenticated: false,
          user: null,
        });
      }

      currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return res.status(200).json({
          success: true,
          authenticated: false,
          user: null,
        });
      }

      if (decoded.tokenVersion !== undefined && currentUser.tokenVersion !== undefined) {
        if (decoded.tokenVersion !== currentUser.tokenVersion) {
          return res.status(200).json({
            success: true,
            authenticated: false,
            user: null,
          });
        }
      } else if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
        return res.status(200).json({
          success: true,
          authenticated: false,
          user: null,
        });
      }
    }

    if (currentUser.isBlocked) {
      return next(new AppError("Your account has been blocked by system administration.", 403));
    }

    const safeUser = {
      id: currentUser._id,
      fullName: currentUser.fullName,
      email: currentUser.email,
      phone: currentUser.phone,
      role: currentUser.role,
      gender: currentUser.gender || "",
      bloodGroup: currentUser.bloodGroup || null,
      state: currentUser.state || "",
      city: currentUser.city || "",
      pincode: currentUser.pincode || "",
      availability: currentUser.availability || "not_available",
      isBlocked: currentUser.isBlocked || false,
      dateOfBirth: currentUser.dateOfBirth || "",
      healthQuestionnaire: currentUser.role === "donor" ? (currentUser.healthQuestionnaire || {}) : undefined,
      accountType: currentUser.accountType || "individual",
      hospitalName: currentUser.hospitalName || "",
      hospitalAddress: currentUser.hospitalAddress || "",
      hospitalContactPhone: currentUser.hospitalContactPhone || "",
      representativeDesignation: currentUser.representativeDesignation || "",
      authorizationNotes: currentUser.authorizationNotes || "",
      verificationStatus: currentUser.verificationStatus || (currentUser.accountType === "hospital_rep" ? "pending" : "verified"),
      verificationRejectionReason: currentUser.verificationRejectionReason || "",
      verifiedAt: currentUser.verifiedAt || null,
      isPhoneVerified: currentUser.isPhoneVerified || false,
      phoneVerifiedAt: currentUser.phoneVerifiedAt || null,
      isEmailVerified: currentUser.isEmailVerified || false,
      emailVerifiedAt: currentUser.emailVerifiedAt || null,
    };

    res.status(200).json({
      success: true,
      authenticated: true,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};
export const updateMe = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      gender,
      state,
      city,
      pincode,
      dateOfBirth,
      hospitalName,
      hospitalAddress,
      hospitalContactPhone,
      representativeDesignation,
      authorizationNotes,
    } = req.body;

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return next(new AppError("Full Name must be a non-empty text string.", 400));
      }
      req.user.fullName = fullName.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return next(new AppError("Email must be a valid text string.", 400));
      }
      const normalizedEmail = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return next(new AppError("Please provide a valid email address.", 400));
      }
      if (normalizedEmail !== req.user.email) {
        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });
        if (existing) {
          return next(new AppError("An account with this email address already exists.", 400));
        }
        req.user.email = normalizedEmail;
        req.user.isEmailVerified = false;
        req.user.emailVerifiedAt = null;
      }
    }

    if (phone !== undefined) {
      const normalizedPhone = normalizeIndianPhone(phone);
      if (!normalizedPhone) {
        return next(new AppError("Please provide a valid 10-digit Indian mobile number.", 400));
      }
      if (normalizedPhone !== req.user.phone) {
        req.user.phone = normalizedPhone;
        req.user.isPhoneVerified = false;
        req.user.phoneVerifiedAt = null;
      }
    }

    if (gender !== undefined) {
      if (gender !== "" && !ALLOWED_GENDERS.includes(gender)) {
        return next(new AppError("Invalid gender value provided.", 400));
      }
      req.user.gender = gender ? gender.trim() : "";
    }

    if (dateOfBirth !== undefined) {
      req.user.dateOfBirth = dateOfBirth ? String(dateOfBirth).trim() : "";
    }

    if (req.user.role === "recipient" && req.user.accountType === "hospital_rep") {
      if (hospitalName !== undefined) req.user.hospitalName = String(hospitalName).trim();
      if (hospitalAddress !== undefined) req.user.hospitalAddress = String(hospitalAddress).trim();
      if (hospitalContactPhone !== undefined) req.user.hospitalContactPhone = String(hospitalContactPhone).trim();
      if (representativeDesignation !== undefined) req.user.representativeDesignation = String(representativeDesignation).trim();
      if (authorizationNotes !== undefined) req.user.authorizationNotes = String(authorizationNotes).trim();
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

    const safeUser = {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      gender: req.user.gender || "",
      bloodGroup: req.user.bloodGroup || null,
      state: req.user.state || "",
      city: req.user.city || "",
      pincode: req.user.pincode || "",
      availability: req.user.availability || "not_available",
      isBlocked: req.user.isBlocked || false,
      isPhoneVerified: req.user.isPhoneVerified || false,
      phoneVerifiedAt: req.user.phoneVerifiedAt || null,
      isEmailVerified: req.user.isEmailVerified || false,
      emailVerifiedAt: req.user.emailVerifiedAt || null,
    };

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Request password reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return next(new AppError("Please provide a valid email address.", 400));
    }

    // Always perform cryptographic token and hash generation to equalize computational workload
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Timing-safe response: simulate DB write + processing latency to prevent account enumeration
    if (!user) {
      const jitterMs = process.env.NODE_ENV === "test" ? 15 + (crypto.randomBytes(1)[0] % 15) : 70 + (crypto.randomBytes(1)[0] % 40);
      await new Promise((resolve) => setTimeout(resolve, jitterMs));

      return res.status(200).json({
        success: true,
        message: "If an account matches that email, instructions to reset your password have been sent.",
      });
    }

    // Token expires in 15 minutes
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Enforce HTTPS for production CLIENT_URL
    let clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    if (process.env.NODE_ENV === "production") {
      if (clientUrl.startsWith("http://")) {
        clientUrl = clientUrl.replace(/^http:\/\//i, "https://");
      } else if (!clientUrl.startsWith("https://")) {
        clientUrl = `https://${clientUrl}`;
      }
    }
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    logAuditEvent({
      actor: user._id,
      actorName: user.fullName,
      action: "PASSWORD_RESET_REQUESTED",
      category: "AUTH",
      target: user._id.toString(),
      ipAddress: req.ip,
      severity: "NORMAL",
      details: `Password reset requested for ${user.email}.`,
    });

    // Attempt outbound email delivery if configured
    try {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.fullName,
        resetUrl,
      });
    } catch (mailError) {
      // Invalidate the generated token if delivery threw an unhandled network error
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save({ validateBeforeSave: false }).catch(() => { });

      // Privately log delivery failure without leaking internal provider error or account existence
      console.error(`[ForgotPassword] Outbound delivery error (suppressed to prevent account enumeration): ${mailError.message}`);

      logAuditEvent({
        actor: user._id,
        actorName: user.fullName,
        action: "PASSWORD_RESET_DELIVERY_FAILURE",
        category: "AUTH",
        target: user._id.toString(),
        ipAddress: req.ip,
        severity: "HIGH",
        details: "Password reset email delivery failed; suppressed from public response to prevent account enumeration.",
      });

      // Indistinguishable public HTTP 200 response to prevent account enumeration
      res.set("Referrer-Policy", "no-referrer");
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      return res.status(200).json({
        success: true,
        message: "If an account matches that email, instructions to reset your password have been sent.",
      });
    }

    res.set("Referrer-Policy", "no-referrer");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.status(200).json({
      success: true,
      message: "If an account matches that email, instructions to reset your password have been sent.",
      ...(process.env.NODE_ENV === "test" ? { testResetToken: resetToken } : {}),
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Reset password using reset token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return next(new AppError("Password reset token is missing.", 400));
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return next(new AppError("Password must be at least 8 characters long.", 400));
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return next(new AppError("Password and confirmation do not match.", 400));
    }

    // Hash the token from parameter to find matching user
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Concurrency-safe atomic token consumption:
    // Pre-hash password with bcrypt to maintain matching salt/cost
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Atomically find user matching valid unexpired token and consume token in one operation
    const user = await User.findOneAndUpdate(
      {
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      },
      {
        $set: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          passwordChangedAt: new Date(),
        },
        $inc: {
          tokenVersion: 1,
        },
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!user) {
      return next(new AppError("Password reset token is invalid or has expired.", 400));
    }

    logAuditEvent({
      actor: user._id,
      actorName: user.fullName,
      action: "PASSWORD_RESET_SUCCESS",
      category: "AUTH",
      target: user._id.toString(),
      ipAddress: req.ip,
      severity: "NORMAL",
      details: `Password successfully reset for ${user.email}.`,
    });

    res.set("Referrer-Policy", "no-referrer");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You may now log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};
