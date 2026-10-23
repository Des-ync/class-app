import type { ExpoConfig } from "expo/config";
import base from "./app.json";
import { assertSimulatorEnvironment, uuid } from "./release/policy.cjs";

export default (): ExpoConfig => {
  const environment = assertSimulatorEnvironment({
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
    buildProfile: process.env.EAS_BUILD_PROFILE,
  });
  const suffix = environment === "staging" ? ".preview" : ".dev";
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
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
    userInterfaceStyle: "light",
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
    name: `ShuttlePass ${environment === "staging" ? "Preview" : "Demo"}`,
    scheme: `shuttlepass${suffix.replace(".", "-")}`,
    ...(process.env.EXPO_APP_OWNER
      ? { owner: process.env.EXPO_APP_OWNER }
      : {}),
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
