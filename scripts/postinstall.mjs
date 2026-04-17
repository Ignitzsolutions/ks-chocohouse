import { spawnSync } from "node:child_process";

if (String(process.env.INSTALL_PUPPETEER_BROWSER ?? "").trim().toLowerCase() !== "true") {
  process.stdout.write(
    "Skipping Puppeteer browser installation. Set INSTALL_PUPPETEER_BROWSER=true to opt in.\n"
  );
  process.exit(0);
}

const result = spawnSync("npx", ["puppeteer", "browsers", "install", "chrome"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
