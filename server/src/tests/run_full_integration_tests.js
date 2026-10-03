import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { io as ClientSocket } from "socket.io-client";

import connectDB from "../config/db.js";
import { initSocket } from "../socket.js";
import { seedAdminUser } from "../config/adminBootstrap.js";
import { DEFAULT_MATCHING_RADIUS_KM } from "../config/constants.js";
import User from "../models/user.model.js";
import BloodRequest from "../models/bloodRequest.js";
import AuditLog from "../models/auditLog.js";

import authRouter from "../routes/auth.routes.js";
import donorRouter from "../routes/donor.routes.js";
import bloodRequestRouter from "../routes/bloodRequest.routes.js";
import adminRouter from "../routes/admin.routes.js";

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

const server = http.createServer(app);
initSocket(server);

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

const timestamp = Date.now();
const recipientEmail = `rec_${timestamp}@bloodward.test`;
const donor1Email = `donor1_${timestamp}@bloodward.test`;
const donor2Email = `donor2_${timestamp}@bloodward.test`;
const farDonorEmail = `far_${timestamp}@bloodward.test`;
const noLocDonorEmail = `noloc_${timestamp}@bloodward.test`;
const adminEmail = `admin_${timestamp}@bloodward.test`;
const testPassword = "Password123!";

async function runTests() {
  console.log("=== BLOODWARD FINAL INTEGRATION CORRECTION TEST SUITE ===");
  await connectDB();

  server.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    let createdRequestId = null;
    let recCookie = "";
    let donor1Cookie = "";
    let donor2Cookie = "";
    let farDonorCookie = "";
    let noLocDonorCookie = "";
    let adminCookie = "";

    try {
      // Setup Recipient (Delhi)
      const recReg = await fetch(`${baseUrl}/auth/register/recipient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Integration Recipient",
          email: recipientEmail,
          phone: "9876543210",
          password: testPassword,
          state: "Delhi",
          city: "New Delhi",
        }),
      });
      recCookie = recReg.headers.get("set-cookie");

      // Setup Donor 1 (Delhi, Available, O+)
      const d1Reg = await fetch(`${baseUrl}/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Delhi Donor 1",
          email: donor1Email,
          phone: "9876543211",
          password: testPassword,
          bloodGroup: "O+",
          state: "Delhi",
          city: "New Delhi",
        }),
      });
      donor1Cookie = d1Reg.headers.get("set-cookie");
      await fetch(`${baseUrl}/donors/me/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: donor1Cookie },
        body: JSON.stringify({ availability: "available" }),
      });

      // Setup Donor 2 (Delhi, Available, O+)
      const d2Reg = await fetch(`${baseUrl}/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Delhi Donor 2",
          email: donor2Email,
          phone: "9876543212",
          password: testPassword,
          bloodGroup: "O+",
          state: "Delhi",
          city: "New Delhi",
        }),
      });
      donor2Cookie = d2Reg.headers.get("set-cookie");
      await fetch(`${baseUrl}/donors/me/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: donor2Cookie },
        body: JSON.stringify({ availability: "available" }),
      });

      // Setup Far Donor (Mumbai, Available, O+)
      const farReg = await fetch(`${baseUrl}/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Mumbai Far Donor",
          email: farDonorEmail,
          phone: "9876543213",
          password: testPassword,
          bloodGroup: "O+",
          state: "Maharashtra",
          city: "Mumbai",
        }),
      });
      farDonorCookie = farReg.headers.get("set-cookie");
      await fetch(`${baseUrl}/donors/me/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: farDonorCookie },
        body: JSON.stringify({ availability: "available" }),
      });

      // Setup Donor with NO location / city
      const noLocReg = await fetch(`${baseUrl}/auth/register/donor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "No Loc Donor",
          email: noLocDonorEmail,
          phone: "9876543214",
          password: testPassword,
          bloodGroup: "O+",
        }),
      });
      noLocDonorCookie = noLocReg.headers.get("set-cookie");
      await fetch(`${baseUrl}/donors/me/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: noLocDonorCookie },
        body: JSON.stringify({ availability: "available" }),
      });

      // TEST F: Request location is derived server-side from recipient profile/city
      const createRes = await fetch(`${baseUrl}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: recCookie },
        body: JSON.stringify({
          bloodGroup: "O+",
          unitsNeeded: 2,
          hospitalName: "AIIMS New Delhi",
          city: "New Delhi",
          urgency: "Emergency",
          requiredDate: "2026-12-31",
          additionalNotes: "Urgent surgery",
          location: { type: "Point", coordinates: [10.0, 10.0] }, // Fake coordinates attempt
        }),
      });
      const createBody = await createRes.json();
      assert(createRes.status === 201 && createBody.success, "1. Request created successfully");
      createdRequestId = createBody.request.id;

      const reqDb = await BloodRequest.findById(createdRequestId);
      const isDelhiCoords = reqDb && reqDb.location && reqDb.location.coordinates[0] === 77.2090 && reqDb.location.coordinates[1] === 28.6139;
      assert(isDelhiCoords, "F. Request location is derived server-side (fake client coordinates ignored)");

      // TEST A: Missing donor location + numeric radius -> request excluded
      const noLocNumericRes = await fetch(`${baseUrl}/requests/available?radius=20`, {
        headers: { cookie: noLocDonorCookie },
      });
      const noLocNumericBody = await noLocNumericRes.json();
      assert(noLocNumericRes.status === 200 && noLocNumericBody.requests.length === 0, "A. Missing donor location + numeric radius excludes request");

      // TEST C: Any Location -> location-independent matching works
      const noLocAnyRes = await fetch(`${baseUrl}/requests/available?radius=any`, {
        headers: { cookie: noLocDonorCookie },
      });
      const noLocAnyBody = await noLocAnyRes.json();
      assert(noLocAnyRes.status === 200 && noLocAnyBody.requests.some(r => r.id === createdRequestId), "C. Any Location search matches regardless of distance");

      // TEST D: Accept outside allowed radius -> rejected (400)
      const farAcceptRes = await fetch(`${baseUrl}/requests/${createdRequestId}/accept`, {
        method: "PATCH",
        headers: { cookie: farDonorCookie },
      });
      assert(farAcceptRes.status === 400, "D. Donor outside 20km radius rejected from accepting request (400)");

      // TEST E: Reject outside allowed radius -> rejected (400)
      const farRejectRes = await fetch(`${baseUrl}/requests/${createdRequestId}/reject`, {
        method: "PATCH",
        headers: { cookie: farDonorCookie },
      });
      assert(farRejectRes.status === 400, "E. Donor outside 20km radius rejected from declining request (400)");

      // TEST E2: Donor 2 inside radius declines request -> succeeds & records in declinedDonors
      const d2RejectRes = await fetch(`${baseUrl}/requests/${createdRequestId}/reject`, {
        method: "PATCH",
        headers: { cookie: donor2Cookie },
      });
      assert(d2RejectRes.status === 200, "E2. Donor 2 inside 20km radius declines request successfully");

      // TEST J: Donor 2 history shows Declined status
      const d2HistRes = await fetch(`${baseUrl}/requests/donor/history`, {
        headers: { cookie: donor2Cookie },
      });
      const d2HistBody = await d2HistRes.json();
      assert(d2HistRes.status === 200 && d2HistBody.requests.some(r => r.id === createdRequestId && r.status === "Declined"), "J1. Donor 2 history displays Declined request accurately");

      // Donor 1 accepts request
      const d1AcceptRes = await fetch(`${baseUrl}/requests/${createdRequestId}/accept`, {
        method: "PATCH",
        headers: { cookie: donor1Cookie },
      });
      assert(d1AcceptRes.status === 200, "Donor 1 accepts request successfully");

      // Transition In Progress -> Fulfilled
      await fetch(`${baseUrl}/requests/${createdRequestId}/in-progress`, {
        method: "PATCH",
        headers: { cookie: recCookie },
      });
      await fetch(`${baseUrl}/requests/${createdRequestId}/fulfill`, {
        method: "PATCH",
        headers: { cookie: recCookie },
      });

      // TEST J2: Donor 1 history shows Fulfilled status
      const d1HistRes = await fetch(`${baseUrl}/requests/donor/history`, {
        headers: { cookie: donor1Cookie },
      });
      const d1HistBody = await d1HistRes.json();
      assert(d1HistRes.status === 200 && d1HistBody.requests.some(r => r.id === createdRequestId && r.status === "Fulfilled"), "J2. Donor 1 history displays Fulfilled request accurately");

      // TEST G: Socket new-request matching (Delhi donor notified, Mumbai donor NOT notified)
      const d1Socket = ClientSocket(`http://127.0.0.1:${port}`, {
        extraHeaders: { cookie: donor1Cookie },
        transports: ["websocket"],
      });
      const farSocket = ClientSocket(`http://127.0.0.1:${port}`, {
        extraHeaders: { cookie: farDonorCookie },
        transports: ["websocket"],
      });

      await Promise.all([
        new Promise((r) => d1Socket.on("connect", r)),
        new Promise((r) => farSocket.on("connect", r)),
      ]);

      let d1ReceivedEvent = null;
      let farReceivedEvent = null;

      d1Socket.on("bloodRequest:new", (p) => { d1ReceivedEvent = p; });
      farSocket.on("bloodRequest:new", (p) => { farReceivedEvent = p; });

      // Create new Delhi request
      const sockReqRes = await fetch(`${baseUrl}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: recCookie },
        body: JSON.stringify({
          bloodGroup: "O+",
          unitsNeeded: 1,
          hospitalName: "Max Delhi",
          city: "New Delhi",
          urgency: "Emergency",
          requiredDate: "2026-12-31",
        }),
      });
      const sockReqBody = await sockReqRes.json();
      const sockReqId = sockReqBody.request.id;

      await new Promise((r) => setTimeout(r, 400));

      assert(d1ReceivedEvent && d1ReceivedEvent.requestId === sockReqId, "G1. Delhi donor within 20km receives realtime socket notification");
      assert(farReceivedEvent === null, "G2. Mumbai donor (>500km) does NOT receive realtime socket notification for Delhi request");

      d1Socket.disconnect();
      farSocket.disconnect();

      // TEST I & 7: Actual Logout socket lifecycle isolation
      // 1. Login user A
      const userALogin = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: donor1Email, password: testPassword }),
      });
      const userACookie = userALogin.headers.get("set-cookie");

      // 2. Establish socket user A
      const socketA = ClientSocket(`http://127.0.0.1:${port}`, {
        extraHeaders: { cookie: userACookie },
        transports: ["websocket"],
      });
      await new Promise((r) => socketA.on("connect", r));
      assert(socketA.connected, "I1. Socket user A connected");

      // 3. Call actual logout endpoint
      const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        headers: { cookie: userACookie },
      });
      const logoutCookie = logoutRes.headers.get("set-cookie");
      assert(logoutRes.status === 200 && logoutCookie && logoutCookie.includes("token="), "I2. Actual HTTP POST /auth/logout clears session cookie");

      // 4. Disconnect application socket
      socketA.disconnect();
      assert(!socketA.connected, "I3. User A socket disconnected upon logout");

      // 5. Login user B (Recipient)
      const userBLogin = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recipientEmail, password: testPassword }),
      });
      const userBCookie = userBLogin.headers.get("set-cookie");

      // 6. Establish socket user B
      const socketB = ClientSocket(`http://127.0.0.1:${port}`, {
        extraHeaders: { cookie: userBCookie },
        transports: ["websocket"],
      });
      await new Promise((r) => socketB.on("connect", r));
      assert(socketB.connected, "I4. User B socket connected with fresh session");

      let userBReceivedDonorEvent = false;
      socketB.on("bloodRequest:new", () => { userBReceivedDonorEvent = true; });

      // Trigger a donor notification event
      const reqForDonor = await fetch(`${baseUrl}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: userBCookie },
        body: JSON.stringify({
          bloodGroup: "O+",
          unitsNeeded: 1,
          hospitalName: "Apollo Delhi",
          city: "New Delhi",
          urgency: "Normal",
          requiredDate: "2026-12-31",
        }),
      });

      await new Promise((r) => setTimeout(r, 400));
      assert(!userBReceivedDonorEvent, "I5. Isolated session rooms: Recipient User B never receives donor-only room notifications");

      socketB.disconnect();

      // TEST 23-26: Admin Bootstrap Reset & Login
      process.env.ADMIN_EMAIL = adminEmail;
      process.env.ADMIN_PASSWORD = "OldAdminPassword123!";
      process.env.ADMIN_BOOTSTRAP_RESET = "false";
      await seedAdminUser();

      process.env.ADMIN_PASSWORD = "NewAdminPassword123!";
      process.env.ADMIN_BOOTSTRAP_RESET = "true";
      await seedAdminUser();

      const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "NewAdminPassword123!" }),
      });
      adminCookie = adminLoginRes.headers.get("set-cookie");
      assert(adminLoginRes.status === 200, "Admin bootstrap reset & login succeeds");

      const adminDashRes = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { cookie: adminCookie },
      });
      assert(adminDashRes.status === 200, "Admin dashboard loads successfully");

    } catch (err) {
      console.error("Error during integration correction tests:", err);
    } finally {
      // Cleanup
      await User.deleteMany({ email: { $in: [recipientEmail, donor1Email, donor2Email, farDonorEmail, noLocDonorEmail, adminEmail] } });
      await BloodRequest.deleteMany({ hospitalName: { $regex: "AIIMS|Max|Apollo" } });

      server.close();
      await mongoose.connection.close();

      console.log(`===================================
Suite | Passed | Total | Failed
Full Integration Correction | ${passed} | ${passed + failed} | ${failed}
===================================`);
      process.exit(failed > 0 ? 1 : 0);
    }
  });
}

runTests();
