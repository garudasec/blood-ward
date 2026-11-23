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
  forgotPasswordOtp,
  resetPasswordOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { forgotPasswordLimiter, otpVerifyLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register/donor", registerDonor);
router.post("/register/recipient", registerRecipient);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/forgot-password-otp", forgotPasswordLimiter, forgotPasswordOtp);
router.post("/reset-password-otp", otpVerifyLimiter, resetPasswordOtp);
router.get("/me", getMe);
router.put("/me", protect, updateMe);

export default router;
