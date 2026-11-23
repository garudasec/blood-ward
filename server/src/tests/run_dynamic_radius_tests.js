import './testDb.js';
import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { io as Client } from "socket.io-client";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

import BloodRequest from "../models/bloodRequest.js";
import User from "../models/user.model.js";
import requestRoutes from "../routes/bloodRequest.routes.js";
import { initSocket, emitToUser } from "../socket.js";
import { calculateDefaultRadiusKm, ALLOWED_RADIUS_PRESETS } from "../controllers/bloodRequestController.js";

dotenv.config({ path: "./.env" });

const testRun = async () => {
  console.log("=== BLOODWARD DYNAMIC RADIUS & EXPANSION TEST SUITE ===");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected.");

  // Test Unit: calculateDefaultRadiusKm
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  assert.strictEqual(calculateDefaultRadiusKm(todayIST), 20, "Today should default to 20 km");

  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrow);
  assert.strictEqual(calculateDefaultRadiusKm(tomorrowIST), 30, "Tomorrow should default to 30 km");

  const future = new Date(Date.now() + 86400000 * 3);
  const futureIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(future);
  assert.strictEqual(calculateDefaultRadiusKm(futureIST), 50, "3 days later should default to 50 km");
  console.log("[✅ PASS] Unit 1: calculateDefaultRadiusKm horizon tests passed");

  // Setup Express App
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const httpServer = createServer(app);
  const ioServer = initSocket(httpServer);

  app.use((req, res, next) => {
    // Auth mock extractor from cookie
    const token = req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    next();
  });

  app.use("/api/requests", requestRoutes);

  // Global error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  });

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/requests`;

  const ts = Date.now();
  // Create Recipient in Delhi
  const recUser = await User.create({
    fullName: "Radius Recipient",
    email: `rec_radius_${ts}@bloodward.test`,
    password: "Password123!",
    phone: "9876543210",
    role: "recipient",
    state: "Delhi",
    city: "New Delhi",
    location: { type: "Point", coordinates: [77.2090, 28.6139] },
  });

  // Create Donor 1 in Delhi (~0 km away)
  const donor1 = await User.create({
    fullName: "Delhi Donor 1",
    email: `d1_radius_${ts}@bloodward.test`,
    phone: "9876543211",
    password: "Password123!",
    role: "donor",
    bloodGroup: "O+",
    dateOfBirth: "1995-05-15",
    availability: "available",
    state: "Delhi",
    city: "New Delhi",
    location: { type: "Point", coordinates: [77.2090, 28.6139] },
  });

  // Create Donor 2 in Ghaziabad (~25 km away from New Delhi coords [77.4538, 28.6692])
  const donor2 = await User.create({
    fullName: "Ghaziabad Donor 2",
    email: `d2_radius_${ts}@bloodward.test`,
    phone: "9876543212",
    password: "Password123!",
    role: "donor",
    bloodGroup: "O+",
    dateOfBirth: "1995-05-15",
    availability: "available",
    state: "Uttar Pradesh",
    city: "Ghaziabad",
    location: { type: "Point", coordinates: [77.4538, 28.6692] },
  });

  const recToken = jwt.sign({ id: recUser._id, role: "recipient", fullName: recUser.fullName }, process.env.JWT_SECRET);
  const recCookie = `token=${recToken}`;

  const d1Token = jwt.sign({ id: donor1._id, role: "donor", fullName: donor1.fullName, availability: "available", bloodGroup: "O+", state: donor1.state, city: donor1.city, location: donor1.location, dateOfBirth: "1995-05-15" }, process.env.JWT_SECRET);
  const d1Cookie = `token=${d1Token}`;

  const d2Token = jwt.sign({ id: donor2._id, role: "donor", fullName: donor2.fullName, availability: "available", bloodGroup: "O+", state: donor2.state, city: donor2.city, location: donor2.location, dateOfBirth: "1995-05-15" }, process.env.JWT_SECRET);
  const d2Cookie = `token=${d2Token}`;

  // Sockets for Donor 1 and Donor 2
  const d1ClientSocket = Client(`http://127.0.0.1:${port}`, {
    extraHeaders: { cookie: d1Cookie },
  });
  const d2ClientSocket = Client(`http://127.0.0.1:${port}`, {
    extraHeaders: { cookie: d2Cookie },
  });

  await Promise.all([
    new Promise((resolve) => d1ClientSocket.on("connect", resolve)),
    new Promise((resolve) => d2ClientSocket.on("connect", resolve)),
  ]);

  let d1NotifCount = 0;
  let d2NotifCount = 0;
  d1ClientSocket.on("bloodRequest:new", () => { d1NotifCount++; });
  d2ClientSocket.on("bloodRequest:new", () => { d2NotifCount++; });

  // TEST 1: Create request with explicit radius 20 KM
  const createRes = await fetch(`${baseUrl}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: recCookie },
    body: JSON.stringify({
      bloodGroup: "O+",
      unitsNeeded: 2,
      hospitalName: "AIIMS New Delhi",
      city: "New Delhi",
      urgency: "Normal",
      requiredDate: todayIST,
      radiusKm: 20,
    }),
  });
  const createData = await createRes.json();
  assert.strictEqual(createRes.status, 201);
  const reqId = createData.request.id;
  assert.strictEqual(createData.request.radiusKm, 20);
  console.log("[✅ PASS] Test 1: Blood request created with radius 20 KM");

  // Wait for socket events to deliver
  for (let i = 0; i < 30 && d1NotifCount === 0; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }

  // Donor 1 is 0 km (<= 20km) -> notified
  // Donor 2 is ~25 km (> 20km) -> NOT notified
  assert.strictEqual(d1NotifCount, 1, "Donor 1 should receive realtime notification within 20 KM");
  assert.strictEqual(d2NotifCount, 0, "Donor 2 (~25 KM) should NOT receive realtime notification at 20 KM");
  console.log("[✅ PASS] Test 2: Only donors within 20 KM notified on creation");

  // TEST 3: Donor 2 tries to accept request -> 400 DISTANCE_LIMIT_EXCEEDED
  const d2AcceptRes = await fetch(`${baseUrl}/${reqId}/accept`, {
    method: "PATCH",
    headers: { cookie: d2Cookie },
  });
  const d2AcceptData = await d2AcceptRes.json();
  assert.strictEqual(d2AcceptRes.status, 400);
  assert.strictEqual(d2AcceptData.code, "DISTANCE_LIMIT_EXCEEDED");
  assert.strictEqual(d2AcceptData.maxAllowedKm, 20);
  console.log("[✅ PASS] Test 3: Acceptance outside request.radiusKm strictly rejected (400)");

  // TEST 4: Recipient expands radius from 20 KM to 30 KM
  const expandRes = await fetch(`${baseUrl}/${reqId}/expand-radius`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: recCookie },
    body: JSON.stringify({ newRadiusKm: 30 }),
  });
  const expandData = await expandRes.json();
  assert.strictEqual(expandRes.status, 200);
  assert.strictEqual(expandData.request.radiusKm, 30);
  console.log("[✅ PASS] Test 4: Radius expanded to 30 KM successfully");

  // Wait for expansion socket event
  for (let i = 0; i < 30 && d2NotifCount === 0; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }

  // Donor 1 should STILL have 1 notification (no duplicate notification!)
  // Donor 2 should now have 1 notification (received new event!)
  assert.strictEqual(d1NotifCount, 1, "Donor 1 must NOT receive duplicate notification on expansion");
  assert.strictEqual(d2NotifCount, 1, "Donor 2 must receive notification when expanded to 30 KM");
  console.log("[✅ PASS] Test 5: Expansion deduplication confirmed: only newly eligible donor notified");

  // TEST 6: Donor 2 now accepts the request within expanded 30 KM -> 200 SUCCESS
  const d2AcceptRes2 = await fetch(`${baseUrl}/${reqId}/accept`, {
    method: "PATCH",
    headers: { cookie: d2Cookie },
  });
  const d2AcceptData2 = await d2AcceptRes2.json();
  if (d2AcceptRes2.status !== 200) {
    console.error("DEBUG d2AcceptData2 failure:", d2AcceptRes2.status, d2AcceptData2);
  }
  assert.strictEqual(d2AcceptRes2.status, 200);
  assert.strictEqual(d2AcceptData2.request.status, "Donor Accepted");
  console.log("[✅ PASS] Test 6: Donor within expanded 30 KM successfully accepts request");

  // Cleanup
  d1ClientSocket.disconnect();
  d2ClientSocket.disconnect();
  httpServer.close();
  await BloodRequest.deleteMany({ recipient: recUser._id });
  await User.deleteMany({ _id: { $in: [recUser._id, donor1._id, donor2._id] } });
  await mongoose.disconnect();
  console.log("=========================================");
  console.log("FINAL RESULTS: 7/7");
  console.log("ALL DYNAMIC RADIUS & EXPANSION TESTS PASSED!");
};

testRun().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
