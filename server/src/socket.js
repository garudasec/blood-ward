import { isBloodCompatible } from "./utils/bloodCompatibility.js";
import { DEFAULT_MATCHING_RADIUS_KM } from './config/constants.js';
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/user.model.js";
import { getCityCoordinates } from "./utils/cityCoordinates.js";

let io = null;

/**
 * Parse raw cookie string to find token
 */
const parseCookie = (cookieString, cookieName) => {
  if (!cookieString) return null;
  const cookies = cookieString.split(";");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

/**
 * Initialize Socket.IO server on top of HTTP server
 */
export const initSocket = (httpServer) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      credentials: true,
      methods: ["GET", "POST", "PATCH"],
    },
  });

  // Handshake authentication middleware using HttpOnly JWT cookie
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie;
      const token = parseCookie(cookieHeader, "token");

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || user.isBlocked) {
        return next(new Error("Authentication error: User blocked or non-existent"));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const userRole = socket.user.role;

    // Join private user room and role room
    socket.join(`user:${userId}`);
    if (userRole) {
      socket.join(`role:${userRole}`);
    }

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

/**
 * Emit event to a specific user private room
 */
export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  const targetRoom = `user:${userId.toString()}`;
  io.to(targetRoom).emit(event, payload);
};

/**
 * Emit event to all users in a specific role room
 */
export const emitToRole = (role, event, payload) => {
  if (!io) return;
  io.to(`role:${role}`).emit(event, payload);
};

/**
 * Notify matching available donors of a new blood request
 */
export const notifyMatchingDonors = async (bloodRequest) => {
  if (!io) return;
  try {
    if (!bloodRequest.location || !Array.isArray(bloodRequest.location.coordinates) || bloodRequest.location.coordinates.length < 2) {
      console.log("[Socket.IO] Skipping notify: Blood request has no valid coordinates.");
      return;
    }

    const matchCriteria = {
      role: "donor",
      availability: "available",
      isBlocked: false,
    };

    const potentialDonors = await User.find(matchCriteria);
    const reqCoords = bloodRequest.location.coordinates;

    const privacySafePayload = {
      requestId: bloodRequest._id.toString(),
      bloodGroup: bloodRequest.bloodGroup,
      unitsNeeded: bloodRequest.unitsNeeded,
      hospitalName: bloodRequest.hospitalName,
      city: bloodRequest.city,
      urgency: bloodRequest.urgency,
      requiredDate: bloodRequest.requiredDate,
      createdAt: bloodRequest.createdAt,
    };

    for (const donor of potentialDonors) {
      // Check blood group compatibility
      if (!isBloodCompatible(donor.bloodGroup, bloodRequest.bloodGroup)) {
        continue;
      }

      // Check donor location existence & distance
      let donorCoords = donor.location?.coordinates;
      if (!donorCoords && donor.state && donor.city) {
        const cityCoords = getCityCoordinates(donor.state, donor.city);
        if (cityCoords) donorCoords = [cityCoords.lng, cityCoords.lat];
      }

      if (!donorCoords) continue;

      // Calculate Haversine distance
      const [lng1, lat1] = donorCoords;
      const [lng2, lat2] = reqCoords;
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Math.round(R * c * 10) / 10;

      if (dist <= DEFAULT_MATCHING_RADIUS_KM) {
        emitToUser(donor._id, "bloodRequest:new", privacySafePayload);
        if (bloodRequest.urgency === "Emergency") {
          emitToUser(donor._id, "bloodRequest:emergency", privacySafePayload);
        }
      }
    }
  } catch (err) {
    console.error("[Socket.IO] Error notifying matching donors:", err.message);
  }
};
