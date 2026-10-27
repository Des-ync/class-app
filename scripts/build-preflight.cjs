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
  }
  console.log(
    `Build preflight passed: ${environment} (on-device demo data${environment === "production" ? ", store distribution" : ", internal distribution"}).`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
