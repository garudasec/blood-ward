import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getCityCoordinates } from "../utils/cityCoordinates.js";

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (val) {
          return (
            Array.isArray(val) &&
            val.length === 2 &&
            typeof val[0] === "number" &&
            !Number.isNaN(val[0]) &&
            typeof val[1] === "number" &&
            !Number.isNaN(val[1])
          );
        },
        message: "Coordinates must contain exactly two numbers [longitude, latitude]",
      },
    },
  },
  { _id: false }
);

const healthQuestionnaireSchema = new mongoose.Schema(
  {
    currentWeight: {
      type: Number,
      default: null,
    },
    medicalConditions: {
      type: String,
      default: "",
      trim: true,
    },
    medications: {
      type: String,
      default: "",
      trim: true,
    },
    recentIllnessOrFever: {
      type: Boolean,
      default: false,
    },
    recentSurgery: {
      type: Boolean,
      default: false,
    },
    previousDonation: {
      type: Boolean,
      default: false,
    },
    lastDonationDate: {
      type: String,
      default: "",
      trim: true,
    },
    additionalNotes: {
      type: String,
      default: "",
      trim: true,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Non-binary", "Other", "Prefer not to say", ""],
      default: "",
      trim: true,
    },
    dateOfBirth: {
      type: String,
      default: "",
      trim: true,
    },
    healthQuestionnaire: {
      type: healthQuestionnaireSchema,
      default: () => ({}),
    },
    // Recipient & Hospital Representative specific fields
    accountType: {
      type: String,
      enum: ["individual", "hospital_rep"],
      default: "individual",
    },
    hospitalName: {
      type: String,
      default: "",
      trim: true,
    },
    hospitalAddress: {
      type: String,
      default: "",
      trim: true,
    },
    hospitalContactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    representativeDesignation: {
      type: String,
      default: "",
      trim: true,
    },
    authorizationNotes: {
      type: String,
      default: "",
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "verified",
    },
    verificationRejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerifiedAt: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },
    passwordResetToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    profilePhoto: {
      type: String,
      default: "",
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "donor", "recipient"],
      default: "donor",
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    pincode: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: pointSchema,
      required: false,
    },
    availability: {
      type: String,
      enum: ["available", "not_available"],
      default: "not_available",
    },
    activeAcceptedMatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: "2dsphere" });
userSchema.index({ role: 1, availability: 1, isBlocked: 1 });
userSchema.index({ bloodGroup: 1 });

userSchema.pre("save", async function () {
  if (this.state && this.city) {
    const coords = getCityCoordinates(this.state, this.city);
    if (coords) {
      this.location = {
        type: "Point",
        coordinates: [coords.lng, coords.lat],
      };
    } else {
      this.location = undefined;
    }
  } else {
    this.location = undefined;
  }

  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const User = mongoose.model("User", userSchema);

export default User;
