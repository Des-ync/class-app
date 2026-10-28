import type { ExpoConfig } from "expo/config";
import base from "./app.json";
import { resolveEnvironment, uuid } from "./release/policy.cjs";

export default (): ExpoConfig => {
  const environment = resolveEnvironment({
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
    buildProfile: process.env.EAS_BUILD_PROFILE,
  });
  // Every environment ships the on-device simulation. Production is the store
  // listing of that demo; dev and preview installs sit beside it.
  const suffix = { demo: ".dev", staging: ".preview", production: "" }[
    environment
  ];
  const name = {
    demo: "ShuttlePass Dev",
    staging: "ShuttlePass Preview",
    production: "ShuttlePass Demo",
  }[environment];
  // `npx eas-cli init` identity: an environment variable wins over app.json.
  const committed = base.expo as {
    owner?: string;
    extra?: { eas?: { projectId?: string } };
  };
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID || committed.extra?.eas?.projectId;
  const owner = process.env.EXPO_APP_OWNER || committed.owner;
  if (projectId && !uuid(projectId))
    throw new Error(
      "EXPO_PUBLIC_EAS_PROJECT_ID must be a valid EAS project UUID.",
    );
  const classification = process.env.EXPO_IOS_NON_EXEMPT_ENCRYPTION;
  if (classification && !["true", "false"].includes(classification))
    throw new Error("EXPO_IOS_NON_EXEMPT_ENCRYPTION must be true or false.");
  return {
    ...base.expo,
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    plugins: [
      ...base.expo.plugins,
      [
        "expo-splash-screen",
        {
          image: "./assets/icon.png",
          imageWidth: 180,
          resizeMode: "contain",
          backgroundColor: "#0F172A",
        },
      ],
    ],
    name,
    scheme: `shuttlepass${suffix.replace(".", "-")}`,
    ...(owner ? { owner } : {}),
    ios: {
      ...base.expo.ios,
      bundleIdentifier: `${base.expo.ios.bundleIdentifier}${suffix}`,
      infoPlist: {
        UIFileSharingEnabled: false,
        LSSupportsOpeningDocumentsInPlace: false,
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: false },
        ...(classification
          ? { ITSAppUsesNonExemptEncryption: classification === "true" }
          : {}),
      },
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [],
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"],
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
            NSPrivacyAccessedAPITypeReasons: ["E174.1"],
          },
        ],
      },
    },
    android: {
      ...base.expo.android,
      package: `${base.expo.android.package}${suffix}`,
      allowBackup: false,
      permissions: [],
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.VIBRATE",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
      ],
    },
    updates: { enabled: false },
    extra: {
      appEnvironment: environment,
      dataMode: "simulation",
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
