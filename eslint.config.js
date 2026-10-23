const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: [
      "dist/**",
      "dist-web/**",
      "dist-native/**",
      "dist-release/**",
      ".test-build/**",
      ".test-web/**",
      "artifacts/**",
      "node_modules/**",
    ],
  },
]);
