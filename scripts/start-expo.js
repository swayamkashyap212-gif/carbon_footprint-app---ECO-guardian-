const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const tmpRoot = path.join(projectRoot, ".tmp");
const metroCacheRoot = path.join(projectRoot, ".metro-cache");
const expoBin = path.join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "expo.cmd" : "expo");

fs.mkdirSync(tmpRoot, { recursive: true });
fs.mkdirSync(metroCacheRoot, { recursive: true });

const args = ["start", "--host", "localhost", "--port", "8081", ...process.argv.slice(2)];
const command = process.platform === "win32" ? "cmd.exe" : expoBin;
const commandArgs =
  process.platform === "win32"
    ? ["/d", "/c", expoBin, ...args]
    : args;

const child = spawn(command, commandArgs, {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    TMP: tmpRoot,
    TEMP: tmpRoot,
    TMPDIR: tmpRoot,
    EXPO_NO_TELEMETRY: "1"
  }
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
