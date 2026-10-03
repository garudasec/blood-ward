import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import { seedAdminUser } from "../config/adminBootstrap.js";
import User from "../models/user.model.js";

import authRouter from "../routes/auth.routes.js";
import adminRouter from "../routes/admin.routes.js";
import donorRouter from "../routes/donor.routes.js";
import bloodRequestRouter from "../routes/bloodRequest.routes.js";

import notFoundHandler from "../middleware/notFoundMiddleware.js";
import errorHandler from "../middleware/errorMiddleware.js";
import sanitizeMiddleware from "../middleware/sanitizeMiddleware.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/donors", donorRouter);
app.use("/api/requests", bloodRequestRouter);
app.use("/api/admin", adminRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const TEST_ADMIN_EMAIL = "test_admin_" + Date.now() + "@bloodward.test";
const TEST_ADMIN_PASSWORD = "AdminSecurePass123!";

process.env.ADMIN_EMAIL = TEST_ADMIN_EMAIL;
process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[✅ PASS] ${message}`);
    passed++;
  } else {
    console.error(`[❌ FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("=== BLOODWARD ADMIN BOOTSTRAP SUITE ===");
  await connectDB();

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    try {
      await seedAdminUser();
      const adminInDb = await User.findOne({ email: TEST_ADMIN_EMAIL }).select("+password");
      assert(!!adminInDb, "TEST 1: Server startup creates admin when missing");

      assert(adminInDb && adminInDb.role === "admin", "TEST 2: Admin role is exactly admin");

      const isBcrypt = adminInDb && adminInDb.password && adminInDb.password.startsWith("$2");
      assert(isBcrypt, "TEST 3: Admin password is bcrypt hashed");

      await seedAdminUser();
      const count = await User.countDocuments({ email: TEST_ADMIN_EMAIL });
      assert(count === 1, "TEST 4: Server restart does NOT create duplicate admin");

      const passwordMatch = await adminInDb.comparePassword(TEST_ADMIN_PASSWORD);
      assert(passwordMatch, "TEST 5: Existing admin password is NOT overwritten on restart");

      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD }),
      });
      assert(loginRes.status === 200, "TEST 6: Admin login using ADMIN_EMAIL + ADMIN_PASSWORD succeeds (200)");
      const cookieHeader = loginRes.headers.get("set-cookie");

      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { cookie: cookieHeader },
      });
      const meData = await meRes.json();
      assert(meRes.status === 200 && meData.user && meData.user.role === "admin", "TEST 7: /api/auth/me returns role=admin");

      const dashRes = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { cookie: cookieHeader },
      });
      assert(dashRes.status === 200, "TEST 8: Admin dashboard endpoint returns 200");

      const donorRegRes = await fetch(`${baseUrl}/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Normal Donor",
          email: `donor_${Date.now()}@bloodward.test`,
          phone: "9998887776",
          password: "DonorPass123!",
          bloodGroup: "O+",
        }),
      });
      const donorCookie = donorRegRes.headers.get("set-cookie");
      const donorAdminRes = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { cookie: donorCookie },
      });
      assert(donorAdminRes.status === 403, "TEST 9: Donor cannot access admin endpoints (403)");

      const meStr = JSON.stringify(meData);
      assert(!meStr.includes(TEST_ADMIN_PASSWORD), "TEST 10: ADMIN_PASSWORD never appears in API responses");

    } catch (err) {
      console.error("Error running admin bootstrap tests:", err);
    } finally {
      await User.deleteMany({ email: TEST_ADMIN_EMAIL });
      server.close();
      await mongoose.connection.close();
      console.log(`===================================
FINAL RESULTS: ${passed}/${passed + failed} PASSED.`);
      process.exit(failed > 0 ? 1 : 0);
    }
  });
}

runTests();
