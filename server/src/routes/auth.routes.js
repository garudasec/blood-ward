import express from "express";
import {
  registerDonor,
  registerRecipient,
  login,
  logout,
  getMe,
  updateMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register/donor", registerDonor);
router.post("/register/recipient", registerRecipient);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

export default router;
