import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");
const staticSourceDir = path.join(rootDir, ".next", "static");
const staticTargetDir = path.join(standaloneDir, ".next", "static");
const publicSourceDir = path.join(rootDir, "public");
const publicTargetDir = path.join(standaloneDir, "public");

function copyDirIfExists(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

if (!fs.existsSync(standaloneServer)) {
  console.error("Standalone build not found. Run `npm run build` first.");
  process.exit(1);
}

copyDirIfExists(staticSourceDir, staticTargetDir);
copyDirIfExists(publicSourceDir, publicTargetDir);

const child = spawn(process.execPath, [standaloneServer], {
  stdio: "inherit",
  cwd: standaloneDir,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
