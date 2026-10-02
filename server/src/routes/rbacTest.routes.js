import express from "express";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @TEMPORARY_TEST_ROUTES
 * These routes are created strictly for Phase 4 RBAC verification and testing.
 */

router.get("/donor", protect, restrictTo("donor"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authorized donor access granted.",
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      role: req.user.role,
    },
  });
});

router.get("/recipient", protect, restrictTo("recipient"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authorized recipient access granted.",
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      role: req.user.role,
    },
  });
});

router.get("/admin", protect, restrictTo("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authorized admin access granted.",
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      role: req.user.role,
    },
  });
});

router.post("/admin", protect, restrictTo("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authorized admin access granted via POST.",
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      role: req.user.role,
    },
  });
});

export default router;
