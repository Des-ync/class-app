const esbuild = require("esbuild");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
esbuild.buildSync({
  entryPoints: ["tests/store.spec.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".test-build/store.cjs",
  alias: {
    "@react-native-async-storage/async-storage":
      path.resolve("tests/storage.ts"),
  },
});
const result = spawnSync(
  process.execPath,
  ["--test", ".test-build/store.cjs"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
