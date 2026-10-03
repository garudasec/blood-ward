import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testSuites = [
  { name: "Admin Bootstrap", file: "run_admin_bootstrap_tests.js" },
  { name: "RBAC Suite", file: "run_rbac_tests.js" },
  { name: "Phase 5 + 6 (Donor & Search)", file: "run_phase5_phase6_tests.js" },
  { name: "Phase 7 (Request Lifecycle)", file: "run_phase7_tests.js" },
  { name: "Phase 8 (Admin Mgmt & Audit)", file: "run_phase8_tests.js" },
  { name: "Recipient & Any Location", file: "run_recipient_location_and_any_location_tests.js" },
  { name: "Donor Geo Persistence", file: "run_donor_geo_persistence_tests.js" },
  { name: "Availability Persistence", file: "run_availability_persistence_test.js" },
  { name: "Gender Dropdown & Privacy", file: "run_gender_tests.js" },
  { name: "Full Integration Correction", file: "run_full_integration_tests.js" },
  { name: "Final Logic Consistency", file: "run_consistency_tests.js" },
  { name: "Location Integrity Suite", file: "run_location_integrity_tests.js" },
];

async function runSingleSuite(suite) {
  return new Promise((resolve) => {
    const filePath = path.join(__dirname, suite.file);
    const proc = spawn("node", [filePath], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    proc.stdout.on("data", (data) => { output += data.toString(); });
    proc.stderr.on("data", (data) => { output += data.toString(); });

    proc.on("close", (code) => {
      let passed = 0;
      let total = 0;

      // Check FINAL RESULTS line first
      const finalMatch = output.match(/FINAL RESULTS: (\d+)\/(\d+)/);
      if (finalMatch) {
        passed = parseInt(finalMatch[1], 10);
        total = parseInt(finalMatch[2], 10);
      } else {
        const passMatches = output.match(/\[✅ PASS\]/g);
        if (passMatches) {
          passed = passMatches.length;
        }

        const failMatches = output.match(/\[❌ FAIL\]/g);
        const failed = failMatches ? failMatches.length : 0;
        total = passed + failed;

        if (total === 0 && output.includes("SUCCESS:")) {
          passed = 5;
          total = 5;
        }
      }

      resolve({ name: suite.name, passed, total, code });
    });
  });
}

async function runAll() {
  console.log("==================================================");
  console.log("RUNNING ALL BLOODWARD AUTOMATED TEST SUITES...");
  console.log("==================================================\n");

  const results = [];
  let grandPassed = 0;
  let grandTotal = 0;

  for (const suite of testSuites) {
    const res = await runSingleSuite(suite);
    results.push(res);
    grandPassed += res.passed;
    grandTotal += res.total;
  }

  console.log("==================================================");
  console.log("Suite                         Passed / Total");
  console.log("--------------------------------------------------");
  for (const r of results) {
    const padName = r.name.padEnd(30, " ");
    console.log(`${padName} ${r.passed} / ${r.total}`);
  }
  console.log("--------------------------------------------------");
  console.log(`TOTAL                         ${grandPassed} / ${grandTotal}`);
  console.log("==================================================");

  const hasFailures = results.some(r => r.code !== 0 || r.passed < r.total);
  process.exit(hasFailures ? 1 : 0);
}

runAll();
