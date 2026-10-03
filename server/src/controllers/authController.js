import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import { ALLOWED_GENDERS, isValidPincode } from "../utils/validators.js";

const signToken = (id, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing from environment configuration");
  }
  return jwt.sign({ id, role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const token = signToken(user._id, user.role);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
  };

  res.status(statusCode).json({
    success: true,
    message,
    user: safeUser,
  });
};

export const registerDonor = async (req, res, next) => {
  try {
    const { fullName, email, phone, gender, password, bloodGroup, state, city, pincode, isAvailable, availability } = req.body;

    if (!fullName || !email || !phone || !password || !bloodGroup) {
      return next(new AppError("Full Name, Email, Phone, Password, and Blood Group are required for donor registration.", 400));
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

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      gender: gender ? gender.trim() : "",
      password,
      role: "donor",
      bloodGroup,
      state: state ? state.trim() : "",
      city: city ? city.trim() : "",
      pincode: pincode ? pincode.trim() : "",
      availability: donorAvailability,
    });

    logAuditEvent({
      actor: newUser._id,
      actorName: newUser.fullName,
      action: "REGISTER_DONOR",
      category: "AUTH",
      target: newUser._id.toString(),
      ipAddress: req.ip,
      severity: "NORMAL",
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
    const { fullName, email, phone, gender, password, location, state, city } = req.body;

    if (!fullName || !email || !phone || !password) {
      return next(new AppError("Full Name, Email, Phone, and Password are required for recipient registration.", 400));
    }

    if (gender !== undefined && gender !== "" && !ALLOWED_GENDERS.includes(gender)) {
      return next(new AppError("Invalid gender value provided.", 400));
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError("An account with this email address already exists.", 400));
    }

    const recipientCity = (location || city || "").trim();

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      gender: gender ? gender.trim() : "",
      password,
      role: "recipient",
      state: state ? state.trim() : "",
      city: recipientCity,
    });

    logAuditEvent({
      actor: newUser._id,
      actorName: newUser.fullName,
      action: "REGISTER_RECIPIENT",
      category: "AUTH",
      target: newUser._id.toString(),
      ipAddress: req.ip,
      severity: "NORMAL",
    });

    sendTokenResponse(newUser, 201, res, "Recipient registration successful.");
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
      return next(new AppError("Invalid email or password.", 401));
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
      return next(new AppError("Invalid email or password.", 401));
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
    sameSite: "lax",
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

export const getMe = async (req, res) => {
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
  };

  res.status(200).json({
    success: true,
    user: safeUser,
  });
};

export const updateMe = async (req, res, next) => {
  try {
    const { fullName, phone, gender, state, city, pincode } = req.body;

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return next(new AppError("Full Name must be a non-empty text string.", 400));
      }
      req.user.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return next(new AppError("Phone number must be a non-empty text string.", 400));
      }
      req.user.phone = phone.trim();
    }

    if (gender !== undefined) {
      if (gender !== "" && !ALLOWED_GENDERS.includes(gender)) {
        return next(new AppError("Invalid gender value provided.", 400));
      }
      req.user.gender = gender ? gender.trim() : "";
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
