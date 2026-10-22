const esbuild = require("esbuild");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
for (const [input, output] of [
  ["domain.test.ts", "domain"],
  ["store.spec.ts", "store"],
]) {
  esbuild.buildSync({
    entryPoints: [`tests/${input}`],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: `.test-build/${output}.cjs`,
    alias: {
      "@react-native-async-storage/async-storage":
        path.resolve("tests/storage.ts"),
      "expo-crypto": path.resolve("tests/crypto.ts"),
    },
  });
}
const result = spawnSync(
  process.execPath,
  ["--test", ".test-build/domain.cjs", ".test-build/store.cjs"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
