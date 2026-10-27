import { registerRootComponent } from "expo";

import { resolveEnvironment } from "./release/policy.cjs";

// Fail fast on an unknown environment before any state is loaded.
resolveEnvironment({ appEnvironment: process.env.EXPO_PUBLIC_APP_ENV });
const App = require("./App").default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
