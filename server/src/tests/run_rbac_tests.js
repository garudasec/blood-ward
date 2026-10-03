import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import User from "../models/user.model.js";
import healthRouter from "../routes/health.routes.js";
import authRouter from "../routes/auth.routes.js";
import rbacTestRouter from "../routes/rbacTest.routes.js";
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

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/test/rbac", rbacTestRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const runTests = async () => {
  console.log("=== BLOODWARD PHASE 4 RBAC AUTOMATED SUITE ===");
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = "http://127.0.0.1:" + port;
  console.log("Test server running on " + baseUrl);

  // Clean up existing test users if any
  await User.deleteMany({ email: /.*_test_rbac@bloodward\.test$/ });

  const password = "Password123!";
  const donor = await User.create({
    fullName: "Test Donor",
    email: "donor_test_rbac@bloodward.test",
    phone: "1112223333",
    password,
    role: "donor",
    bloodGroup: "O+",
    availability: "available",
  });

  const recipient = await User.create({
    fullName: "Test Recipient",
    email: "recipient_test_rbac@bloodward.test",
    phone: "4445556666",
    password,
    role: "recipient",
  });

  const admin = await User.create({
    fullName: "Test Admin",
    email: "admin_test_rbac@bloodward.test",
    phone: "7778889999",
    password,
    role: "admin",
  });

  const blockedDonor = await User.create({
    fullName: "Test Blocked Donor",
    email: "blocked_donor_test_rbac@bloodward.test",
    phone: "0001112222",
    password,
    role: "donor",
    isBlocked: true,
  });

  const loginUser = async (email, requestedRole) => {
    const body = { email, password };
    if (requestedRole !== undefined) {
      body.role = requestedRole;
    }
    const res = await fetch(baseUrl + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const setCookie = res.headers.get("set-cookie");
    const data = await res.json().catch(() => ({}));
    return { status: res.status, setCookie, data };
  };

  const donorLogin = await loginUser(donor.email);
  const recipientLogin = await loginUser(recipient.email);
  const adminLogin = await loginUser(admin.email);
  const blockedLogin = await loginUser(blockedDonor.email);

  const getCookieHeader = (loginRes) => {
    if (!loginRes.setCookie) return "";
    return loginRes.setCookie.split(";")[0];
  };

  const donorCookie = getCookieHeader(donorLogin);
  const recipientCookie = getCookieHeader(recipientLogin);
  const adminCookie = getCookieHeader(adminLogin);

  const request = async (path, options = {}) => {
    const res = await fetch(baseUrl + path, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const results = [];

  const record = (id, desc, expected, actual, passed) => {
    results.push({ id, desc, expected, actual, passed });
    const mark = passed ? "✅ PASS" : "❌ FAIL";
    console.log(id + ": " + desc + " -> Expected: " + expected + ", Got: " + actual + " [" + mark + "]");
  };

  // TEST 1: No Cookie -> donor endpoint (Expected 401)
  const t1 = await request("/api/test/rbac/donor");
  record("TEST 1", "No cookie -> donor endpoint", 401, t1.status, t1.status === 401);

  // TEST 2: Donor -> donor endpoint (Expected 200)
  const t2 = await request("/api/test/rbac/donor", { headers: { Cookie: donorCookie } });
  record("TEST 2", "Donor -> donor endpoint", 200, t2.status, t2.status === 200);

  // TEST 3: Donor -> recipient endpoint (Expected 403)
  const t3 = await request("/api/test/rbac/recipient", { headers: { Cookie: donorCookie } });
  record("TEST 3", "Donor -> recipient endpoint", 403, t3.status, t3.status === 403);

  // TEST 4: Donor -> admin endpoint (Expected 403)
  const t4 = await request("/api/test/rbac/admin", { headers: { Cookie: donorCookie } });
  record("TEST 4", "Donor -> admin endpoint", 403, t4.status, t4.status === 403);

  // TEST 5: Recipient -> recipient endpoint (Expected 200)
  const t5 = await request("/api/test/rbac/recipient", { headers: { Cookie: recipientCookie } });
  record("TEST 5", "Recipient -> recipient endpoint", 200, t5.status, t5.status === 200);

  // TEST 6: Recipient -> donor endpoint (Expected 403)
  const t6 = await request("/api/test/rbac/donor", { headers: { Cookie: recipientCookie } });
  record("TEST 6", "Recipient -> donor endpoint", 403, t6.status, t6.status === 403);

  // TEST 7: Recipient -> admin endpoint (Expected 403)
  const t7 = await request("/api/test/rbac/admin", { headers: { Cookie: recipientCookie } });
  record("TEST 7", "Recipient -> admin endpoint", 403, t7.status, t7.status === 403);

  // TEST 8: Admin -> admin endpoint (Expected 200)
  const t8 = await request("/api/test/rbac/admin", { headers: { Cookie: adminCookie } });
  record("TEST 8", "Admin -> admin endpoint", 200, t8.status, t8.status === 200);

  // TEST 9: Admin -> donor endpoint (Expected 403)
  const t9 = await request("/api/test/rbac/donor", { headers: { Cookie: adminCookie } });
  record("TEST 9", "Admin -> donor endpoint", 403, t9.status, t9.status === 403);

  // TEST 10: Admin -> recipient endpoint (Expected 403)
  const t10 = await request("/api/test/rbac/recipient", { headers: { Cookie: adminCookie } });
  record("TEST 10", "Admin -> recipient endpoint", 403, t10.status, t10.status === 403);

  // TEST 11: Invalid JWT (Expected 401)
  const t11 = await request("/api/test/rbac/donor", { headers: { Cookie: "token=invalid.jwt.token" } });
  record("TEST 11", "Invalid JWT token", 401, t11.status, t11.status === 401);

  // TEST 12: Blocked user (Expected 403)
  record("TEST 12", "Blocked user login/request attempt", 403, blockedLogin.status, blockedLogin.status === 403);

  // TEST 13: Role tampering via body (Expected 403)
  const t13 = await request("/api/test/rbac/admin", {
    method: "POST",
    headers: { Cookie: donorCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin" }),
  });
  record("TEST 13", "Role tampering via body", 403, t13.status, t13.status === 403);

  // TEST 14: Role tampering via X-Role header (Expected 403)
  const t14 = await request("/api/test/rbac/admin", {
    headers: { Cookie: donorCookie, "X-Role": "admin" },
  });
  record("TEST 14", "Fake X-Role header", 403, t14.status, t14.status === 403);

  // TEST 15: Role tampering via query string (Expected 403)
  const t15 = await request("/api/test/rbac/admin?role=admin", {
    headers: { Cookie: donorCookie },
  });
  record("TEST 15", "Fake query role parameter", 403, t15.status, t15.status === 403);

  // LOGIN ROLE MATRIX TESTS
  const lr1 = await loginUser(donor.email, "donor");
  record("LOGIN MATRIX 1", "Donor credentials + requestedRole=donor", 200, lr1.status, lr1.status === 200);

  const lr2 = await loginUser(donor.email, "recipient");
  record("LOGIN MATRIX 2", "Donor credentials + requestedRole=recipient", 403, lr2.status, lr2.status === 403);

  const lr3 = await loginUser(donor.email, "admin");
  record("LOGIN MATRIX 3", "Donor credentials + requestedRole=admin", 403, lr3.status, lr3.status === 403);

  const lr4 = await loginUser(recipient.email, "recipient");
  record("LOGIN MATRIX 4", "Recipient credentials + requestedRole=recipient", 200, lr4.status, lr4.status === 200);

  const lr5 = await loginUser(recipient.email, "donor");
  record("LOGIN MATRIX 5", "Recipient credentials + requestedRole=donor", 403, lr5.status, lr5.status === 403);

  const lr6 = await loginUser(recipient.email, "admin");
  record("LOGIN MATRIX 6", "Recipient credentials + requestedRole=admin", 403, lr6.status, lr6.status === 403);

  const lr7 = await loginUser(admin.email, "admin");
  record("LOGIN MATRIX 7", "Admin credentials + requestedRole=admin", 200, lr7.status, lr7.status === 200);

  const lr8 = await loginUser(admin.email, "donor");
  record("LOGIN MATRIX 8", "Admin credentials + requestedRole=donor", 403, lr8.status, lr8.status === 403);

  const lr9 = await loginUser(admin.email, "recipient");
  record("LOGIN MATRIX 9", "Admin credentials + requestedRole=recipient", 403, lr9.status, lr9.status === 403);

  const lr10 = await loginUser(donor.email);
  record("LOGIN MATRIX 10", "Login without requestedRole (backwards compatibility)", 200, lr10.status, lr10.status === 200);

  const lr11 = await loginUser(donor.email, "invalid_role");
  record("LOGIN MATRIX 11", "Invalid requestedRole parameter", 400, lr11.status, lr11.status === 400);

  const lr12Res = await fetch(baseUrl + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: donor.email, password: "WrongPassword!", role: "admin" }),
  });
  record("LOGIN MATRIX 12", "Wrong password + mismatched requestedRole returns 401", 401, lr12Res.status, lr12Res.status === 401);

  // Cleanup
  await User.deleteMany({ email: /.*_test_rbac@bloodward\.test$/ });
  console.log("Database clean up finished.");

  server.close();
  await mongoose.disconnect();

  const totalPassed = results.filter((r) => r.passed).length;
  console.log("===================================");
  console.log("FINAL RESULTS: " + totalPassed + "/" + results.length + " PASSED.");
  if (totalPassed !== results.length) {
    process.exit(1);
  }
};

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
