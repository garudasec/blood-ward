import express from "express";
import {
  registerDonor,
  registerRecipient,
  login,
  logout,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { forgotPasswordLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * Strict Referrer-Policy and cache control middleware for password reset endpoints.
 * Explicitly overrides the app-level Helmet policy to ensure reset tokens and
 * recovery parameters are never leaked via Referer headers, proxy caches, or history.
 */
const enforcePasswordResetSecurityHeaders = (req, res, next) => {
  res.set("Referrer-Policy", "no-referrer");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
};

router.post("/register/donor", registerDonor);
router.post("/register/recipient", registerRecipient);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", enforcePasswordResetSecurityHeaders, forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token", enforcePasswordResetSecurityHeaders, resetPassword);
router.get("/me", getMe);
router.put("/me", protect, updateMe);

export default router;
