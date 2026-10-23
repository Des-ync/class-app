const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const {
  resolveEnvironment,
  assertSimulatorEnvironment,
  productionChecks,
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
    assertSimulatorEnvironment({ appEnvironment: "staging" }),
    "staging",
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
  assert.throws(
    () => assertSimulatorEnvironment({ appEnvironment: "production" }),
    /local simulator/,
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
test("production capabilities remain blocked even when environment values are supplied", () => {
  const env = {
    EXPO_PUBLIC_EAS_PROJECT_ID: "12345678-1234-4123-8123-123456789abc",
    EXPO_APP_OWNER: "operator",
    EXPO_PUBLIC_API_URL: "https://api.operator-domain.com",
    EXPO_PUBLIC_PRIVACY_URL: "https://operator-domain.com/privacy",
    EXPO_PUBLIC_TERMS_URL: "https://operator-domain.com/terms",
    EXPO_PUBLIC_DELETION_URL: "https://operator-domain.com/delete",
    EXPO_PUBLIC_SUPPORT_EMAIL: "support@operator-domain.com",
    EXPO_IOS_NON_EXEMPT_ENCRYPTION: "false",
  };
  const checks = productionChecks(env, readiness);
  assert.ok(
    checks
      .filter((c) => c.id.startsWith("capability."))
      .every((c) => !c.passed),
  );
  assert.ok(checks.some((c) => c.id === "expo.project" && c.passed));
  assert.ok(checks.some((c) => c.id === "evidence.live_backend" && !c.passed));
});
test("production preflight rejects missing integrations while preview is buildable", () => {
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
test("Expo config refuses to export the simulator as a production app", () => {
  const result = spawnSync(
    process.execPath,
    [require.resolve("expo/bin/cli"), "config", "--type", "public", "--json"],
    {
      cwd: root,
      env: {
        ...process.env,
        EXPO_OFFLINE: "1",
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_APP_ENV: "production",
      },
      encoding: "utf8",
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /local simulator|Production launch is blocked/);
});

test("launch gate requires a clean, fresh audit matching the exact dependency lockfile", () => {
  const { auditGate } = require("../scripts/release-check.cjs");
  const now = Date.parse("2026-10-23T08:00:00Z");
  const audit = {
    generatedAt: new Date(now).toISOString(),
    lockfileSha256: "lock",
    counts: { high: 0, critical: 0 },
  };
  assert.equal(auditGate(audit, "lock", now).passed, true);
  assert.equal(auditGate(audit, "changed", now).passed, false);
  assert.equal(auditGate(audit, "lock", now + 86400001).passed, false);
  assert.equal(
    auditGate({ ...audit, counts: { high: 1, critical: 0 } }, "lock", now)
      .passed,
    false,
  );
  assert.equal(auditGate(undefined, "lock", now).passed, false);
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
