const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { productionChecks } = require("../release/policy.cjs");
const readiness = require("../release/readiness.json");
const eas = require("../eas.json");
const app = require("../app.json");
function auditGate(audit, lockHash, now = Date.now()) {
  const age = now - Date.parse(audit?.generatedAt);
  return {
    id: "dependency.audit",
    passed:
      audit?.schemaVersion === 2 &&
      audit?.scope === "shipped" &&
      audit?.lockfileSha256 === lockHash &&
      Number.isFinite(age) &&
      age >= 0 &&
      age <= 86400000 &&
      audit?.blocking?.high === 0 &&
      audit?.blocking?.critical === 0,
    detail: audit?.blocking
      ? `Shipped dependencies: ${audit.blocking.high} high, ${audit.blocking.critical} critical without an active exception; must be zero, less than 24 hours old, and match package-lock.json.`
      : "A fresh lockfile-bound dependency audit is required (npm run security:audit).",
  };
}
// Store builds receive the public values committed in eas.json and the project
// identity committed in app.json; an explicitly set environment variable takes
// precedence, as it does on EAS.
function releaseEnv(profile = "production") {
  const set = (value) => (value ? value : undefined);
  return {
    EXPO_APP_OWNER: set(app.expo.owner),
    EXPO_PUBLIC_EAS_PROJECT_ID: set(app.expo.extra?.eas?.projectId),
    ...eas.build[profile].env,
    ...Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => value !== ""),
    ),
  };
}
function report(
  target = "production",
  env = releaseEnv(target === "testflight" ? "beta" : "production"),
) {
  const checks = productionChecks(env, readiness, target);
  let audit;
  try {
    audit = JSON.parse(
      fs.readFileSync(path.resolve("release/dependency-audit.json"), "utf8"),
    );
  } catch {
    audit = undefined;
  }
  checks.push(
    auditGate(
      audit,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.resolve("package-lock.json")))
        .digest("hex"),
    ),
  );
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    target,
    ready: checks.every((c) => c.passed),
    checks,
  };
}
if (require.main === module) {
  const target = process.argv.includes("--testflight")
    ? "testflight"
    : "production";
  const result = report(target);
  if (process.argv.includes("--report")) {
    fs.mkdirSync(path.resolve("release"), { recursive: true });
    fs.writeFileSync(
      "release/status.json",
      JSON.stringify(result, null, 2) + "\n",
    );
  }
  console.log(
    `${target === "testflight" ? "TestFlight beta" : "Production launch"}: ${result.ready ? "READY" : "BLOCKED"} (${result.checks.filter((c) => c.passed).length}/${result.checks.length} checks passed)`,
  );
  for (const check of result.checks)
    console.log(
      `${check.passed ? "PASS" : "BLOCKED"} ${check.id}: ${check.detail}`,
    );
  if (!result.ready && !process.argv.includes("--report")) process.exitCode = 1;
}
module.exports = { report, auditGate, releaseEnv };
