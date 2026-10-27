const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const {
  resolveEnvironment,
  productionChecks,
  requiredEvidence,
  publicHttps,
} = require("../release/policy.cjs");
const readiness = require("../release/readiness.json");
const eas = require("../eas.json");
const app = require("../app.json");
const root = require("node:path").resolve(__dirname, "..");

test("environment selection fails closed and production cannot be downgraded to demo", () => {
  assert.equal(resolveEnvironment(), "demo");
  assert.equal(resolveEnvironment({ buildProfile: "preview" }), "staging");
  assert.equal(
    resolveEnvironment({ appEnvironment: "production" }),
    "production",
  );
  assert.throws(
    () => resolveEnvironment({ appEnvironment: "prod" }),
    /must be/,
  );
  assert.throws(
    () =>
      resolveEnvironment({
        buildProfile: "production",
        appEnvironment: "demo",
      }),
    /requires/,
  );
});
test("public endpoint syntax excludes insecure, local and example destinations", () => {
  for (const url of [
    "http://api.operator-domain.com",
    "https://localhost",
    "https://operator.test",
    "https://operator.invalid",
    "https://127.0.0.1",
    "https://[::1]",
    "https://example.com",
    "https://api.example.com",
    "https://api.operator.local",
    "https://user:password@api.operator-domain.com",
    "https://api.operator-domain.com/#secret",
    "invalid",
  ])
    assert.equal(publicHttps(url), false, url);
  assert.equal(publicHttps("https://api.operator-domain.com/v1"), true);
});
const storeEnv = {
  EXPO_PUBLIC_EAS_PROJECT_ID: "12345678-1234-4123-8123-123456789abc",
  EXPO_APP_OWNER: "operator",
  EXPO_PUBLIC_PRIVACY_URL: "https://operator-domain.com/privacy",
  EXPO_PUBLIC_SUPPORT_EMAIL: "support@operator-domain.com",
  EXPO_IOS_NON_EXEMPT_ENCRYPTION: "false",
};
test("demo store release needs store identity and evidence, not a backend", () => {
  const checks = productionChecks(storeEnv, readiness);
  for (const id of [
    "expo.project",
    "expo.owner",
    "EXPO_PUBLIC_PRIVACY_URL",
    "support.email",
    "ios.export-compliance",
  ])
    assert.ok(checks.find((c) => c.id === id)?.passed, id);
  assert.ok(!checks.some((c) => /backend|billing|capability/.test(c.id)));
  // Unverified evidence keeps the release blocked.
  assert.ok(
    !productionChecks(storeEnv, { checks: [] })
      .filter((c) => c.id.startsWith("evidence."))
      .some((c) => c.passed),
  );
  const verified = {
    checks: requiredEvidence.map((id) => ({
      id,
      status: "verified",
      evidence: "release/evidence/" + id + ".md",
    })),
  };
  assert.ok(productionChecks(storeEnv, verified).every((c) => c.passed));
  assert.ok(
    !productionChecks(
      { ...storeEnv, EXPO_PUBLIC_SUPPORT_EMAIL: "help@example.com" },
      verified,
    ).find((c) => c.id === "support.email").passed,
  );
  assert.ok(
    !productionChecks(
      { ...storeEnv, EXPO_PUBLIC_PRIVACY_URL: "" },
      verified,
    ).find((c) => c.id === "EXPO_PUBLIC_PRIVACY_URL").passed,
  );
});
test("production preflight blocks until launch checks pass while preview is buildable", () => {
  for (const environment of ["demo", "staging"]) {
    const result = spawnSync(
      process.execPath,
      ["scripts/build-preflight.cjs"],
      {
        cwd: root,
        env: {
          ...process.env,
          EAS_BUILD_PROFILE: environment === "demo" ? "development" : "preview",
          EXPO_PUBLIC_APP_ENV: environment,
        },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
  }
  const blocked = spawnSync(process.execPath, ["scripts/build-preflight.cjs"], {
    cwd: root,
    env: {
      ...process.env,
      EAS_BUILD_PROFILE: "production",
      EXPO_PUBLIC_APP_ENV: "production",
      // A missing project blocks regardless of the committed evidence, so this
      // still holds once the repository itself is release-ready.
      EXPO_PUBLIC_EAS_PROJECT_ID: "",
      EXPO_APP_OWNER: "",
    },
    encoding: "utf8",
  });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /Production build blocked/);
});
test("profiles enforce internal previews and store-only production artifacts", () => {
  assert.equal(eas.build.preview.distribution, "internal");
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_APP_ENV, "staging");
  assert.equal(eas.build.production.distribution, "store");
  assert.equal(eas.build.production.env.EXPO_PUBLIC_APP_ENV, "production");
  assert.equal(eas.build.production.android.buildType, "app-bundle");
  assert.equal(eas.build.production.autoIncrement, true);
  assert.equal(eas.submit.production.android.releaseStatus, "draft");
  assert.equal(app.expo.android.package, app.expo.ios.bundleIdentifier);
});

test("resolved preview configuration isolates app identity and removes unused permissions", () => {
  const result = spawnSync(
    process.execPath,
    [require.resolve("expo/bin/cli"), "config", "--type", "public", "--json"],
    {
      cwd: root,
      env: {
        ...process.env,
        EXPO_OFFLINE: "1",
        EXPO_NO_TELEMETRY: "1",
        EAS_BUILD_PROFILE: "preview",
        EXPO_PUBLIC_APP_ENV: "staging",
        EXPO_PUBLIC_EAS_PROJECT_ID: "",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.equal(config.name, "ShuttlePass Preview");
  assert.equal(config.android.package, "app.shuttlepass.mobile.preview");
  assert.equal(config.ios.bundleIdentifier, "app.shuttlepass.mobile.preview");
  assert.equal(config.android.allowBackup, false);
  assert.ok(
    config.android.blockedPermissions.includes(
      "android.permission.RECORD_AUDIO",
    ),
  );
  assert.equal(
    config.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads,
    false,
  );
  assert.equal(config.updates.enabled, false);
});
test("production config is the demo store identity with no extra permissions", () => {
  const result = spawnSync(
    process.execPath,
    [require.resolve("expo/bin/cli"), "config", "--type", "public", "--json"],
    {
      cwd: root,
      env: {
        ...process.env,
        EXPO_OFFLINE: "1",
        EXPO_NO_TELEMETRY: "1",
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_APP_ENV: "production",
        EXPO_PUBLIC_EAS_PROJECT_ID: "",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.equal(config.name, "ShuttlePass Demo");
  assert.equal(config.scheme, "shuttlepass");
  assert.equal(config.ios.bundleIdentifier, app.expo.ios.bundleIdentifier);
  assert.equal(config.android.package, app.expo.android.package);
  assert.deepEqual(config.android.permissions, []);
  assert.equal(config.extra.dataMode, "simulation");
  assert.equal(config.ios.privacyManifests.NSPrivacyTracking, false);
  assert.deepEqual(config.ios.privacyManifests.NSPrivacyCollectedDataTypes, []);
});

test("launch gate requires a fresh shipped-dependency audit matching the lockfile", () => {
  const { auditGate } = require("../scripts/release-check.cjs");
  const now = Date.parse("2026-10-23T08:00:00Z");
  const audit = {
    schemaVersion: 2,
    scope: "shipped",
    generatedAt: new Date(now).toISOString(),
    lockfileSha256: "lock",
    blocking: { high: 0, critical: 0 },
  };
  assert.equal(auditGate(audit, "lock", now).passed, true);
  assert.equal(auditGate(audit, "changed", now).passed, false);
  assert.equal(auditGate(audit, "lock", now + 86400001).passed, false);
  assert.equal(
    auditGate({ ...audit, blocking: { high: 1, critical: 0 } }, "lock", now)
      .passed,
    false,
  );
  assert.equal(
    auditGate({ ...audit, schemaVersion: 1 }, "lock", now).passed,
    false,
  );
  assert.equal(auditGate(undefined, "lock", now).passed, false);
});
test("audit exceptions cover one advisory, need an assessment and expire", () => {
  const {
    activeExceptions,
    blockingFindings,
  } = require("../scripts/audit-dependencies.cjs");
  const now = Date.parse("2026-10-27T00:00:00Z");
  const valid = {
    package: "zod",
    advisory: "GHSA-mrhx-c7xc-m3w5",
    expires: "2027-01-31",
    assessment: "Not bundled.",
  };
  const file = {
    exceptions: [
      valid,
      { ...valid, package: "late", expires: "2026-10-01" },
      { ...valid, package: "long", expires: "2028-01-01" },
      { ...valid, package: "blank", assessment: " " },
    ],
  };
  assert.deepEqual(
    activeExceptions(file, now).map((e) => e.package),
    ["zod"],
  );
  const advisory = (id) => ({ url: `https://github.com/advisories/${id}` });
  const vulnerabilities = {
    zod: { severity: "high", via: [advisory("GHSA-mrhx-c7xc-m3w5")] },
    "@expo/cli": { severity: "high", via: ["zod"] },
    expo: { severity: "high", via: ["@expo/cli"] },
    other: { severity: "high", via: [advisory("GHSA-aaaa-bbbb-cccc")] },
    mixed: { severity: "high", via: ["zod", "other"] },
  };
  assert.deepEqual(
    blockingFindings(vulnerabilities, activeExceptions(file, now)).map(
      (f) => f.name,
    ),
    ["other", "mixed"],
  );
  assert.equal(blockingFindings(vulnerabilities, []).length, 5);
  // The committed exceptions must all be active and well formed.
  const committed = require("../release/audit-exceptions.json");
  assert.equal(
    activeExceptions(committed).length,
    committed.exceptions.length,
    "An audit exception has expired or is incomplete; reassess it.",
  );
});
test("workflow YAML parses and external GitHub actions are pinned to immutable commits", () => {
  const fs = require("node:fs"),
    yaml = require("yaml");
  for (const filename of [
    ".github/workflows/ci.yml",
    ".github/workflows/build.yml",
  ]) {
    const document = yaml.parse(
      fs.readFileSync(require("node:path").join(root, filename), "utf8"),
      { uniqueKeys: true },
    );
    assert.ok(document.jobs);
    for (const job of Object.values(document.jobs))
      for (const step of job.steps || [])
        if (step.uses) assert.match(step.uses, /^[a-z0-9_./-]+@[0-9a-f]{40}$/i);
  }
});

test("native config plugins enforce backup, transport and unused-permission restrictions", () => {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve("expo/bin/cli"),
      "config",
      "--type",
      "introspect",
      "--json",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        EXPO_OFFLINE: "1",
        EXPO_NO_TELEMETRY: "1",
        EAS_BUILD_PROFILE: "preview",
        EXPO_PUBLIC_APP_ENV: "staging",
        EXPO_PUBLIC_EAS_PROJECT_ID: "",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const mods = JSON.parse(result.stdout)._internal.modResults;
  assert.equal(
    mods.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads,
    false,
  );
  assert.equal(
    mods.android.manifest.manifest.application[0].$["android:allowBackup"],
    "false",
  );
  const permissions = mods.android.manifest.manifest["uses-permission"];
  for (const suffix of [
    "RECORD_AUDIO",
    "SYSTEM_ALERT_WINDOW",
    "VIBRATE",
    "CAMERA",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE",
    "READ_MEDIA_IMAGES",
    "READ_MEDIA_VIDEO",
  ])
    assert.ok(
      permissions.some(
        (p) =>
          p.$["android:name"] === `android.permission.${suffix}` &&
          p.$["tools:node"] === "remove",
      ),
      suffix,
    );
});

test("hosted store pages match the committed privacy policy and build values", () => {
  const fs = require("node:fs"),
    path = require("node:path");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const policy = read("PRIVACY.md");
  const page = read("site/privacy/index.html");
  for (const heading of policy.match(/^## .+$/gm))
    assert.ok(page.includes(heading.slice(3)), heading);
  assert.ok(
    page.includes(policy.match(/_Last updated: (.+)_/)[1]),
    "site/privacy/index.html and PRIVACY.md last-updated dates differ",
  );
  for (const profile of ["preview", "production"]) {
    const env = eas.build[profile].env;
    assert.ok(publicHttps(env.EXPO_PUBLIC_PRIVACY_URL), profile);
    assert.ok(env.EXPO_PUBLIC_PRIVACY_URL.endsWith("/privacy/"), profile);
    assert.ok(["true", "false"].includes(env.EXPO_IOS_NON_EXEMPT_ENCRYPTION));
    for (const file of [
      "site/privacy/index.html",
      "site/support/index.html",
      "site/delete-data/index.html",
    ])
      assert.ok(read(file).includes(env.EXPO_PUBLIC_SUPPORT_EMAIL), file);
  }
  assert.match(read("netlify.toml"), /publish = "site"/);
});
