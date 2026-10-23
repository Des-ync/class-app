const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["audit", "--json"],
  { encoding: "utf8", shell: false, maxBuffer: 10 * 1024 * 1024 },
);
let audit;
try {
  audit = JSON.parse(result.stdout);
} catch {
  console.error(
    "Dependency audit could not run; no clean audit result is claimed.",
  );
  process.exit(1);
}
if (!audit.metadata?.vulnerabilities) {
  console.error("Registry did not return dependency audit results.");
  process.exit(1);
}
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  lockfileSha256: crypto
    .createHash("sha256")
    .update(fs.readFileSync("package-lock.json"))
    .digest("hex"),
  counts: audit.metadata.vulnerabilities,
  findings: Object.entries(audit.vulnerabilities || {}).map(([name, v]) => ({
    name,
    severity: v.severity,
    direct: v.isDirect,
    advisories: v.via
      .filter((v) => typeof v === "object")
      .map((v) => ({ title: v.title, url: v.url, range: v.range })),
  })),
};
fs.writeFileSync(
  "release/dependency-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Dependency audit: ${report.counts.critical} critical, ${report.counts.high} high, ${report.counts.moderate} moderate, ${report.counts.low} low.`,
);
console.log(
  "Details: release/dependency-audit.json. Registry findings are not a runtime reachability assessment.",
);
if (report.counts.critical || report.counts.high) process.exitCode = 1;
