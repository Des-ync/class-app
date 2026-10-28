const { uuid } = require("../release/policy.cjs");
const { releaseEnv } = require("./release-check.cjs");
const env = releaseEnv();
if (!uuid(env.EXPO_PUBLIC_EAS_PROJECT_ID) || !env.EXPO_APP_OWNER) {
  console.error(
    "Link an operator-owned EAS project and set owner and extra.eas.projectId in app.json (or EXPO_APP_OWNER and EXPO_PUBLIC_EAS_PROJECT_ID) before cloud builds.",
  );
  process.exitCode = 1;
} else
  console.log(
    "EAS project identity is configured. Cloud access and signing credentials are verified by EAS at build time.",
  );
