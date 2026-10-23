const { resolveEnvironment } = require("../release/policy.cjs");
try {
  const environment = resolveEnvironment({
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
    buildProfile: process.env.EAS_BUILD_PROFILE,
  });
  if (environment === "production") {
    const { report } = require("./release-check.cjs");
    const result = report();
    if (!result.ready)
      throw new Error(
        "Production build blocked. Run npm run launch:report and resolve the launch requirements before creating a store artifact.",
      );
    // This entrypoint remains a simulator even if readiness records are edited.
    require("../release/policy.cjs").assertSimulatorEnvironment({
      appEnvironment: environment,
    });
  }
  console.log(
    `Build preflight passed: ${environment} (simulated data, internal distribution only).`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
