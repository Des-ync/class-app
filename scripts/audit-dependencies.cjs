const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const MAX_EXCEPTION_DAYS = 120;
function runAudit(args) {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["audit", "--json", ...args],
    { encoding: "utf8", shell: false, maxBuffer: 10 * 1024 * 1024 },
  );
  let audit;
  try {
    audit = JSON.parse(result.stdout);
  } catch {
    return undefined;
  }
  return audit.metadata?.vulnerabilities ? audit : undefined;
}
// An exception covers one advisory, carries a written assessment and expires,
// so it has to be reviewed again rather than silently accepted for good.
function activeExceptions(file, now = Date.now()) {
  return (file?.exceptions || []).filter((e) => {
    const expires = Date.parse(e.expires);
    return (
      /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(e.advisory || "") &&
      typeof e.package === "string" &&
      typeof e.assessment === "string" &&
      e.assessment.trim().length > 0 &&
      Number.isFinite(expires) &&
      expires > now &&
      expires - now <= MAX_EXCEPTION_DAYS * 86400000
    );
  });
}
// A finding is excepted when every advisory it carries, directly or through
// the packages it depends on, is covered by an active exception.
function blockingFindings(vulnerabilities, exceptions) {
  const isCovered = (name, seen = new Set()) => {
    const v = vulnerabilities[name];
    // Unknown packages and dependency cycles fail closed.
    if (!v || seen.has(name)) return false;
    const path = new Set(seen).add(name);
    return v.via.every((via) =>
      typeof via === "string"
        ? isCovered(via, path)
        : exceptions.some(
            (e) => e.package === name && via.url?.endsWith(e.advisory),
          ),
    );
  };
  return Object.entries(vulnerabilities)
    .filter(([name]) => !isCovered(name))
    .map(([name, v]) => ({ name, severity: v.severity }));
}
function summarize(audit) {
  return Object.entries(audit.vulnerabilities || {}).map(([name, v]) => ({
    name,
    severity: v.severity,
    direct: v.isDirect,
    advisories: v.via
      .filter((v) => typeof v === "object")
      .map((v) => ({ title: v.title, url: v.url, range: v.range })),
  }));
}
function main() {
  const shipped = runAudit(["--omit=dev"]);
  const all = runAudit([]);
  if (!shipped || !all) {
    console.error(
      "Dependency audit could not run; no clean audit result is claimed.",
    );
    process.exit(1);
  }
  const exceptionFile = JSON.parse(
    fs.readFileSync("release/audit-exceptions.json", "utf8"),
  );
  const exceptions = activeExceptions(exceptionFile);
  const blocking = blockingFindings(shipped.vulnerabilities || {}, exceptions);
  const count = (severity) =>
    blocking.filter((f) => f.severity === severity).length;
  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    lockfileSha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync("package-lock.json"))
      .digest("hex"),
    scope: "shipped",
    counts: shipped.metadata.vulnerabilities,
    blocking: { high: count("high"), critical: count("critical") },
    exceptions: exceptions.map((e) => ({
      package: e.package,
      advisory: e.advisory,
      expires: e.expires,
    })),
    findings: summarize(shipped),
    toolchain: {
      counts: all.metadata.vulnerabilities,
      findings: summarize(all),
    },
  };
  fs.writeFileSync(
    "release/dependency-audit.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  const c = report.counts,
    t = report.toolchain.counts;
  console.log(
    `Shipped dependencies: ${c.critical} critical, ${c.high} high, ${c.moderate} moderate, ${c.low} low; ${report.blocking.critical} critical and ${report.blocking.high} high not covered by an active exception.`,
  );
  console.log(
    `Full toolchain (informational): ${t.critical} critical, ${t.high} high, ${t.moderate} moderate, ${t.low} low.`,
  );
  for (const f of blocking.filter((f) =>
    ["high", "critical"].includes(f.severity),
  ))
    console.log(`BLOCKING ${f.severity} ${f.name}`);
  console.log(
    "Details: release/dependency-audit.json. Exceptions: release/audit-exceptions.json.",
  );
  if (report.blocking.critical || report.blocking.high) process.exitCode = 1;
}
if (require.main === module) main();
module.exports = { activeExceptions, blockingFindings, MAX_EXCEPTION_DAYS };
