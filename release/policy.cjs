const capabilities = require("./capabilities.json");
const environments = ["demo", "staging", "production"];
function resolveEnvironment({ appEnvironment, buildProfile } = {}) {
  if (appEnvironment && !environments.includes(appEnvironment))
    throw new Error("EXPO_PUBLIC_APP_ENV must be demo, staging or production.");
  if (
    buildProfile &&
    !["development", "preview", "production"].includes(buildProfile)
  )
    throw new Error("Unknown EAS build profile.");
  const value =
    appEnvironment ||
    (buildProfile === "production"
      ? "production"
      : buildProfile === "preview"
        ? "staging"
        : "demo");
  if (buildProfile === "production" && value !== "production")
    throw new Error(
      "The production build profile requires the production app environment.",
    );
  return value;
}
function assertSimulatorEnvironment(options) {
  const environment = resolveEnvironment(options);
  if (environment === "production")
    throw new Error(
      "Production launch is blocked: this entrypoint is the local simulator. Connect a server-backed client before building or running a production release.",
    );
  return environment;
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
function productionChecks(env, readiness) {
  const expected = {
    client: "server-backed",
    authentication: "server-enforced",
    payments: "verified-webhooks",
    ticketIssuer: "server-held",
    tracking: "driver-location",
    synchronization: "server-reconciled",
    accountDeletion: "server-enforced",
    observability: "monitored",
  };
  const checks = Object.entries(expected).map(([key, value]) => ({
    id: `capability.${key}`,
    passed: capabilities[key] === value,
    detail: `Requires ${value}; current implementation is ${capabilities[key]}.`,
  }));
  checks.push(
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
  );
  for (const key of [
    "EXPO_PUBLIC_API_URL",
    "EXPO_PUBLIC_PRIVACY_URL",
    "EXPO_PUBLIC_TERMS_URL",
    "EXPO_PUBLIC_DELETION_URL",
  ])
    checks.push({
      id: key,
      passed: publicHttps(env[key]),
      detail:
        "A real, publicly reachable HTTPS URL must be configured; release validation does not prove endpoint availability.",
    });
  checks.push(
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
  );
  const required = [
    "store_accounts",
    "legal_and_privacy",
    "live_backend",
    "device_acceptance",
    "billing_acceptance",
    "security_review",
    "operations",
    "dependency_review",
  ];
  for (const id of required) {
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
  assertSimulatorEnvironment,
  productionChecks,
  publicHttps,
  uuid,
};
