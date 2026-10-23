const { spawnSync } = require("node:child_process");
for (const script of ["lint", "typecheck", "test", "test:release"]) {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", script],
    { stdio: "inherit", shell: false },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
