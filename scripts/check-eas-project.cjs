const { uuid } = require("../release/policy.cjs");
if (
  !uuid(process.env.EXPO_PUBLIC_EAS_PROJECT_ID) ||
  !process.env.EXPO_APP_OWNER
) {
  console.error(
    "Link an operator-owned EAS project and configure EXPO_PUBLIC_EAS_PROJECT_ID and EXPO_APP_OWNER before cloud builds.",
  );
  process.exitCode = 1;
} else
  console.log(
    "EAS project identity is configured. Cloud access and signing credentials are verified by EAS at build time.",
  );
