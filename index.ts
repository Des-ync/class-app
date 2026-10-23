import { registerRootComponent } from "expo";

import { assertSimulatorEnvironment } from "./release/policy.cjs";

assertSimulatorEnvironment({ appEnvironment: process.env.EXPO_PUBLIC_APP_ENV });
// Load simulator state and its local issuer only after the environment guard.
const App = require("./App").default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
