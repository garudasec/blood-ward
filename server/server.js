import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import { seedAdminUser } from "./src/config/adminBootstrap.js";
import { initSocket } from "./src/socket.js";

import sanitizeMiddleware from "./src/middleware/sanitizeMiddleware.js";
import { globalLimiter } from "./src/middleware/rateLimiter.js";
import errorHandler from "./src/middleware/errorMiddleware.js";
import notFoundHandler from "./src/middleware/notFoundMiddleware.js";

import healthRouter from "./src/routes/health.routes.js";
import authRouter from "./src/routes/auth.routes.js";
import rbacTestRouter from "./src/routes/rbacTest.routes.js";
import donorRouter from "./src/routes/donor.routes.js";
import bloodRequestRouter from "./src/routes/bloodRequest.routes.js";
import adminRouter from "./src/routes/admin.routes.js";
import hospitalRouter from "./src/routes/hospital.routes.js";
import patientRouter from "./src/routes/patient.routes.js";
import complaintRouter from "./src/routes/complaint.routes.js";
import matchRouter from "./src/routes/match.routes.js";
import inAppNotificationRouter from "./src/routes/inAppNotification.routes.js";
import { runMatchCleanupJob } from "./src/services/matchCleanupService.js";

dotenv.config();

// Validate critical security environment variables on startup
const validateSecurityConfig = () => {
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.ENCRYPTION_SECRET || process.env.ENCRYPTION_SECRET.trim().length < 32) {
    missing.push("ENCRYPTION_SECRET (min 32 chars)");
  }
  if (missing.length > 0) {
    console.error(
      `[SECURITY CONFIGURATION WARNING] The following required security environment variables are missing or invalid: ${missing.join(
        ", "
      )}. Features depending on them (such as encrypted database credentials) will fail until configured in your environment settings (e.g. Render Dashboard).`
    );
  }
};
validateSecurityConfig();

const app = express();

// Secure trusted proxy configuration for Render and production environments
// Render uses 1 reverse proxy hop in front of the application container.
// Never set to `true` (permissive), which blindly trusts arbitrary client-supplied X-Forwarded-For headers.
const isRender = process.env.RENDER === "true" || process.env.RENDER === "1";
const isProd = process.env.NODE_ENV === "production";
const trustProxyEnv = process.env.TRUST_PROXY;

let trustProxyHops = false;
if (trustProxyEnv !== undefined && trustProxyEnv !== "") {
  if (trustProxyEnv === "false" || trustProxyEnv === "0") {
    trustProxyHops = false;
  } else if (trustProxyEnv === "true") {
    trustProxyHops = 1; // Secure default of 1 hop when boolean true is passed
  } else if (!isNaN(Number(trustProxyEnv))) {
    trustProxyHops = parseInt(trustProxyEnv, 10);
  } else {
    trustProxyHops = trustProxyEnv;
  }
} else if (isRender || isProd) {
  trustProxyHops = 1;
}

if (trustProxyHops !== false) {
  app.set("trust proxy", trustProxyHops);
}

app.use(helmet());
app.use(sanitizeMiddleware);

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(cookieParser());

app.use("/api", globalLimiter);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/donors", donorRouter);
app.use("/api/requests", bloodRequestRouter);
app.use("/api/admin", adminRouter);
app.use("/api/hospitals", hospitalRouter);
app.use("/api/patients", patientRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/matches", matchRouter);
app.use("/api/notifications", inAppNotificationRouter);

if (process.env.NODE_ENV !== "production") {
  app.use("/api/test/rbac", rbacTestRouter);
}

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedAdminUser();

  // 1. Startup execution for overdue 45-day retention cleanup (recovers overdue records on server restart / Render wake-up)
  runMatchCleanupJob().catch((err) =>
    console.error("[CleanupJob] Error during startup match cleanup:", err.message)
  );

  // 2. Schedule recurring daily 45-day retention cleanup for completed matches (runs every 24 hours)
  const cleanupInterval = setInterval(() => {
    runMatchCleanupJob().catch((err) =>
      console.error("[CleanupJob] Error during automated match cleanup:", err.message)
    );
  }, 24 * 60 * 60 * 1000);
  if (cleanupInterval.unref) cleanupInterval.unref();

  server.listen(PORT, () => {
    const envMode = process.env.NODE_ENV || "development";
    console.log("[BloodWard Server] Running in " + envMode + " mode on port " + PORT);
  });
});

export { app, server };
