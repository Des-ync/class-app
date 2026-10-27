const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { productionChecks } = require("../release/policy.cjs");
const readiness = require("../release/readiness.json");
const eas = require("../eas.json");
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
// Production builds receive the public values committed in eas.json; an
// explicitly set environment variable takes precedence, as it does on EAS.
function report(env = { ...eas.build.production.env, ...process.env }) {
  const checks = productionChecks(env, readiness);
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
    target: "production",
    ready: checks.every((c) => c.passed),
    checks,
  };
}
if (require.main === module) {
  const result = report();
  if (process.argv.includes("--report")) {
    fs.mkdirSync(path.resolve("release"), { recursive: true });
    fs.writeFileSync(
      "release/status.json",
      JSON.stringify(result, null, 2) + "\n",
    );
  }
  console.log(
    `Production launch: ${result.ready ? "READY" : "BLOCKED"} (${result.checks.filter((c) => c.passed).length}/${result.checks.length} checks passed)`,
  );
  for (const check of result.checks)
    console.log(
      `${check.passed ? "PASS" : "BLOCKED"} ${check.id}: ${check.detail}`,
    );
  if (!result.ready && !process.argv.includes("--report")) process.exitCode = 1;
}
module.exports = { report, auditGate };
