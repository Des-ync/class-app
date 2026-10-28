const { resolveEnvironment } = require("../release/policy.cjs");
try {
  const environment = resolveEnvironment({
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
    buildProfile: process.env.EAS_BUILD_PROFILE,
  });
  const beta = process.env.EAS_BUILD_PROFILE === "beta";
  if (environment === "production") {
    const { report } = require("./release-check.cjs");
    const result = report(beta ? "testflight" : "production");
    if (!result.ready)
      throw new Error(
        beta
          ? "TestFlight build blocked. Run npm run launch:check:beta and resolve what it lists."
          : "Production build blocked. Run npm run launch:report and resolve the launch requirements before creating a store artifact.",
      );
  }
  console.log(
    `Build preflight passed: ${environment} (on-device demo data${beta ? ", TestFlight beta" : environment === "production" ? ", store distribution" : ", internal distribution"}).`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
