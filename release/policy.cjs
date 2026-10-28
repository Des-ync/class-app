const environments = ["demo", "staging", "production"];
function resolveEnvironment({ appEnvironment, buildProfile } = {}) {
  if (appEnvironment && !environments.includes(appEnvironment))
    throw new Error("EXPO_PUBLIC_APP_ENV must be demo, staging or production.");
  if (
    buildProfile &&
    !["development", "preview", "beta", "production"].includes(buildProfile)
  )
    throw new Error("Unknown EAS build profile.");
  const value =
    appEnvironment ||
    (buildProfile === "production" || buildProfile === "beta"
      ? "production"
      : buildProfile === "preview"
        ? "staging"
        : "demo");
  if (
    (buildProfile === "production" || buildProfile === "beta") &&
    value !== "production"
  )
    throw new Error(
      `The ${buildProfile} build profile requires the production app environment.`,
    );
  return value;
}
function publicHttps(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (!url.port || url.port === "443") &&
      host.includes(".") &&
      !host.endsWith(".") &&
      !host.endsWith(".local") &&
      !host.endsWith(".internal") &&
      !host.endsWith(".localhost") &&
      !host.endsWith(".example") &&
      !host.endsWith(".test") &&
      !host.endsWith(".invalid") &&
      !["localhost", "example.com", "example.org", "example.net"].some(
        (s) => host === s || host.endsWith("." + s),
      ) &&
      !/^[\d.]+$/.test(host) &&
      !host.includes(":")
    );
  } catch {
    return false;
  }
}
const uuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const requiredEvidence = [
  "store_accounts",
  "privacy_policy",
  "device_acceptance",
];
// A TestFlight beta is how device acceptance happens on iOS, and EAS creates
// the App Store Connect record during the first submission, so the beta gate
// needs only the hosted privacy policy as evidence.
const evidenceByTarget = {
  production: requiredEvidence,
  testflight: ["privacy_policy"],
};
// Store release of the self-contained demo. Payments, accounts, tracking and
// ticketing stay simulated on the device, so no backend integration is
// required; the checks cover what the stores and the operator must supply.
function productionChecks(env, readiness, target = "production") {
  const checks = [
    {
      id: "expo.project",
      passed: uuid(env.EXPO_PUBLIC_EAS_PROJECT_ID),
      detail: "A linked EAS project UUID is required.",
    },
    {
      id: "expo.owner",
      passed: /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(env.EXPO_APP_OWNER || ""),
      detail: "The owning Expo organization/account must be configured.",
    },
    {
      id: "EXPO_PUBLIC_PRIVACY_URL",
      passed: publicHttps(env.EXPO_PUBLIC_PRIVACY_URL),
      detail:
        "Both stores require a publicly reachable HTTPS privacy policy URL; release validation does not prove endpoint availability.",
    },
    {
      id: "support.email",
      passed:
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          env.EXPO_PUBLIC_SUPPORT_EMAIL || "",
        ) &&
        !/(?:@|\.)example\.(?:com|org|net)$/i.test(
          env.EXPO_PUBLIC_SUPPORT_EMAIL || "",
        ),
      detail: "An operator-owned support email is required.",
    },
    {
      id: "ios.export-compliance",
      passed: ["true", "false"].includes(env.EXPO_IOS_NON_EXEMPT_ENCRYPTION),
      detail:
        "An explicit encryption/export-compliance classification is required.",
    },
  ];
  const evidence = evidenceByTarget[target];
  if (!evidence) throw new Error(`Unknown release target: ${target}`);
  for (const id of evidence) {
    const item = readiness?.checks?.find((item) => item.id === id);
    checks.push({
      id: `evidence.${id}`,
      passed:
        item?.status === "verified" &&
        typeof item.evidence === "string" &&
        item.evidence.trim().length > 0,
      detail: item?.reason || "Verified release evidence is required.",
    });
  }
  return checks;
}
module.exports = {
  resolveEnvironment,
  productionChecks,
  requiredEvidence,
  evidenceByTarget,
  publicHttps,
  uuid,
};
