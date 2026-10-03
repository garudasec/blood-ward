import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";

import User from "../models/user.model.js";
import authRouter from "../routes/auth.routes.js";
import donorRouter from "../routes/donor.routes.js";
import notFoundHandler from "../middleware/notFoundMiddleware.js";
import errorHandler from "../middleware/errorMiddleware.js";
import sanitizeMiddleware from "../middleware/sanitizeMiddleware.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(sanitizeMiddleware);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/donors", donorRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = 42802;
let server;
let baseUrl = "http://127.0.0.1:" + PORT;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers["set-cookie"];
  if (!setCookie) return "";
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieStr.split(";")[0];
}

function assert(testName, condition, detail = "") {
  if (condition) {
    console.log("TEST: " + testName + " [✅ PASS]");
  } else {
    console.error("TEST: " + testName + " [❌ FAIL] " + detail);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log("=== RECIPIENT LOCATION & DONOR SEARCH COMPREHENSIVE E2E SUITE ===");
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(dbUri);
  console.log("MongoDB connected for test");

  await User.deleteMany({ email: /@search_e2e_test\.com$/ });

  server = app.listen(PORT, "127.0.0.1");

  try {
    // -------------------------------------------------------------
    // 1. RECIPIENT REGISTRATION & LOCATION PERSISTENCE
    // -------------------------------------------------------------
    const regRes = await request("/api/auth/register/recipient", {
      method: "POST",
      body: {
        fullName: "Delhi Recipient",
        email: "rec_delhi@search_e2e_test.com",
        phone: "9876543210",
        password: "password123",
        gender: "Male",
        state: "Delhi",
        city: "New Delhi",
      },
    });

    const recipientCookie = extractCookie(regRes.headers);
    assert("1. Register Recipient (State=Delhi, City=New Delhi)", regRes.status === 201 && regRes.data.user.state === "Delhi" && regRes.data.user.city === "New Delhi", JSON.stringify(regRes.data));

    // Update location via PUT /api/auth/me
    const updateLocRes = await request("/api/auth/me", {
      method: "PUT",
      headers: { Cookie: recipientCookie },
      body: {
        state: "Uttarakhand",
        city: "Dehradun",
      },
    });
    assert("2. PUT /api/auth/me saves State=Uttarakhand, City=Dehradun", updateLocRes.status === 200 && updateLocRes.data.user.state === "Uttarakhand" && updateLocRes.data.user.city === "Dehradun", JSON.stringify(updateLocRes.data));

    // Verify location persists after simulated refresh (GET /api/auth/me)
    const refreshRes = await request("/api/auth/me", {
      headers: { Cookie: recipientCookie },
    });
    assert("3. GET /api/auth/me retains saved State=Uttarakhand, City=Dehradun", refreshRes.status === 200 && refreshRes.data.user.state === "Uttarakhand" && refreshRes.data.user.city === "Dehradun", JSON.stringify(refreshRes.data));

    // Reset location back to Delhi / New Delhi for search tests
    await request("/api/auth/me", {
      method: "PUT",
      headers: { Cookie: recipientCookie },
      body: { state: "Delhi", city: "New Delhi" },
    });

    // -------------------------------------------------------------
    // 2. DONOR REGISTRATIONS FOR SEARCH
    // -------------------------------------------------------------
    // Donor 1: Delhi (O+, Available, near 28.6139, 77.2090)
    const d1Res = await request("/api/auth/register/donor", {
      method: "POST",
      body: {
        fullName: "Delhi O+ Donor",
        email: "delhi_donor@search_e2e_test.com",
        phone: "9876543211",
        password: "password123",
        bloodGroup: "O+",
        availability: "available",
        state: "Delhi",
        city: "New Delhi",
        // NO explicit location field sent
      },
    });
    assert("4. Register Donor 1 in Delhi (O+, Available)", d1Res.status === 201, JSON.stringify(d1Res.data));
    const d1Doc = await User.findOne({ email: "delhi_donor@search_e2e_test.com" });
    assert("4b. Donor 1 location automatically derived in MongoDB", d1Doc && d1Doc.location && d1Doc.location.type === "Point" && d1Doc.location.coordinates[0] === 77.209 && d1Doc.location.coordinates[1] === 28.6139, JSON.stringify(d1Doc ? d1Doc.location : null));

    // Donor 2: Mumbai (B+, Available, near 19.0760, 72.8777)
    const d2Res = await request("/api/auth/register/donor", {
      method: "POST",
      body: {
        fullName: "Mumbai B+ Donor",
        email: "mumbai_donor@search_e2e_test.com",
        phone: "9876543212",
        password: "password123",
        bloodGroup: "B+",
        availability: "available",
        state: "Maharashtra",
        city: "Mumbai",
        // NO explicit location field sent
      },
    });
    assert("5. Register Donor 2 in Mumbai (B+, Available)", d2Res.status === 201, JSON.stringify(d2Res.data));

    // -------------------------------------------------------------
    // 3. NORMAL RADIUS SEARCH (DEHRADUN / DELHI COORDINATES)
    // -------------------------------------------------------------
    // Search within 20km near Delhi coordinates (28.6139, 77.2090) for O+
    const normalSearchRes = await request("/api/donors/search?latitude=28.6139&longitude=77.2090&radius=20&bloodGroup=O%2B", {
      headers: { Cookie: recipientCookie },
    });
    assert("6. Normal search (Delhi lat/lng, radius=20km, O+) returns Delhi donor", normalSearchRes.status === 200 && normalSearchRes.data.donors.length === 1 && normalSearchRes.data.donors[0].fullName === "Delhi O+ Donor", JSON.stringify(normalSearchRes.data));

    // Normal search excludes Mumbai donor (outside 20km radius)
    const radiusExcludeRes = await request("/api/donors/search?latitude=28.6139&longitude=77.2090&radius=20&bloodGroup=B%2B", {
      headers: { Cookie: recipientCookie },
    });
    assert("7. Normal radius search excludes Mumbai donor from Delhi 20km search", radiusExcludeRes.status === 200 && radiusExcludeRes.data.donors.length === 0, JSON.stringify(radiusExcludeRes.data));

    // -------------------------------------------------------------
    // 4. ANY LOCATION DONOR SEARCH
    // -------------------------------------------------------------
    // Search Any Location (radius=any) -> returns both Delhi and Mumbai donors
    const anySearchRes = await request("/api/donors/search?radius=any", {
      headers: { Cookie: recipientCookie },
    });
    assert("8. Any Location search (radius=any) returns matching donors regardless of distance", anySearchRes.status === 200 && anySearchRes.data.donors.length >= 2, JSON.stringify(anySearchRes.data));

    // Search Any Location with blood group filter (radius=any & bloodGroup=B+) -> returns Mumbai donor
    const anyBloodSearchRes = await request("/api/donors/search?radius=any&bloodGroup=B%2B", {
      headers: { Cookie: recipientCookie },
    });
    assert("9. Any Location search (radius=any & bloodGroup=B+) returns Mumbai B+ donor", anyBloodSearchRes.status === 200 && anyBloodSearchRes.data.donors.length === 1 && anyBloodSearchRes.data.donors[0].fullName === "Mumbai B+ Donor", JSON.stringify(anyBloodSearchRes.data));

    // -------------------------------------------------------------
    // 5. PRIVACY & ERROR HANDLING CHECKS
    // -------------------------------------------------------------
    // Search results privacy verification
    const donorSample = anySearchRes.data.donors[0];
    assert("10. Search privacy check: email, phone, password, location omitted", donorSample.email === undefined && donorSample.phone === undefined && donorSample.password === undefined && donorSample.location === undefined, JSON.stringify(donorSample));

    // Invalid query parameter error rejection
    const invalidQueryRes = await request("/api/donors/search?invalidParam=123", {
      headers: { Cookie: recipientCookie },
    });
    assert("11. Invalid query parameter rejected with HTTP 400 AppError", invalidQueryRes.status === 400 && invalidQueryRes.data.message.includes("Invalid or unrecognized query parameter"), JSON.stringify(invalidQueryRes.data));

    // Missing required lat/lng for numeric radius search
    const missingCoordsRes = await request("/api/donors/search?radius=10", {
      headers: { Cookie: recipientCookie },
    });
    assert("12. Numeric radius without lat/lng rejected with HTTP 400", missingCoordsRes.status === 400 && missingCoordsRes.data.message.includes("Both latitude and longitude parameters are required"), JSON.stringify(missingCoordsRes.data));

    // -------------------------------------------------------------
    // 6. DONOR PROFILE UPDATE CITY CHANGE & LOCATION REPAIR
    // -------------------------------------------------------------
    // Login as Donor 1
    const d1LoginRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: "delhi_donor@search_e2e_test.com", password: "password123" }
    });
    const d1Cookie = extractCookie(d1LoginRes.headers);

    // Update Donor 1 city to Mumbai
    const updateRes = await request("/api/donors/me", {
      method: "PUT",
      headers: { Cookie: d1Cookie },
      body: { state: "Maharashtra", city: "Mumbai" }
    });
    assert("13. Donor 1 profile update to Mumbai succeeds", updateRes.status === 200, JSON.stringify(updateRes.data));

    const movedDoc = await User.findOne({ email: "delhi_donor@search_e2e_test.com" });
    assert("14. Donor 1 location recalculated to Mumbai [72.8777, 19.0760]", movedDoc && movedDoc.location && movedDoc.location.coordinates[0] === 72.8777 && movedDoc.location.coordinates[1] === 19.076, JSON.stringify(movedDoc ? movedDoc.location : null));

    // Delhi 20km radius search now excludes moved donor
    const delhiSearchAfterMove = await request("/api/donors/search?latitude=28.6139&longitude=77.2090&radius=20&bloodGroup=O%2B", {
      headers: { Cookie: recipientCookie }
    });
    assert("15. Delhi 20km search excludes donor after moving to Mumbai", delhiSearchAfterMove.status === 200 && delhiSearchAfterMove.data.donors.length === 0, JSON.stringify(delhiSearchAfterMove.data));

    // Any Location search STILL finds donor in Mumbai
    const anySearchAfterMove = await request("/api/donors/search?radius=any&bloodGroup=O%2B", {
      headers: { Cookie: recipientCookie }
    });
    assert("16. Any Location search still finds donor after city change", anySearchAfterMove.status === 200 && anySearchAfterMove.data.donors.some(d => d.fullName === "Delhi O+ Donor" && d.city === "Mumbai"), JSON.stringify(anySearchAfterMove.data));

    // Strip location field to simulate legacy donor without GeoJSON location
    await User.updateOne({ email: "delhi_donor@search_e2e_test.com" }, { $unset: { location: "" } });
    const strippedDoc = await User.findOne({ email: "delhi_donor@search_e2e_test.com" });
    assert("17. Legacy donor artificially stripped of location field", strippedDoc && !strippedDoc.location, "Location cleared");

    // Legacy donor saves profile (Delhi / New Delhi)
    await request("/api/donors/me", {
      method: "PUT",
      headers: { Cookie: d1Cookie },
      body: { state: "Delhi", city: "New Delhi" }
    });

    const repairedDoc = await User.findOne({ email: "delhi_donor@search_e2e_test.com" });
    assert("18. Legacy donor repaired with GeoJSON Point location on profile save", repairedDoc && repairedDoc.location && repairedDoc.location.type === "Point" && repairedDoc.location.coordinates[0] === 77.209 && repairedDoc.location.coordinates[1] === 28.6139, JSON.stringify(repairedDoc ? repairedDoc.location : null));


  } catch (err) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    await User.deleteMany({ email: /@search_e2e_test\.com$/ });
    await mongoose.disconnect();
    if (server) server.close();
    console.log("Cleanup finished.");
  }
}

runTests();
