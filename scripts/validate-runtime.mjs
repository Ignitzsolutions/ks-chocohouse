import fs from "node:fs/promises";
import { access, constants } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { getRuntimeConfig } from "./runtime-config.mjs";

async function resolveChromePath() {
  const configuredPath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_EXECUTABLE_PATH ||
    "";
  const candidates = [
    configuredPath,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue.
    }
  }

  try {
    const puppeteerModule = await import("puppeteer");
    const bundledExecutablePath = puppeteerModule.default.executablePath();
    if (bundledExecutablePath) {
      await access(bundledExecutablePath, constants.X_OK);
      return bundledExecutablePath;
    }
  } catch {
    // Continue.
  }

  throw new Error("No executable Chrome or Chromium runtime was found");
}

async function verifyChromeLaunch(executablePath) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent("<html><body>runtime-ok</body></html>", {
      waitUntil: "networkidle0",
    });
    await page.close();
  } finally {
    await browser.close();
  }
}

async function main() {
  const config = getRuntimeConfig();

  await fs.mkdir(path.dirname(config.databasePath), { recursive: true });
  await fs.mkdir(config.uploadsDir, { recursive: true });
  await access(path.dirname(config.databasePath), constants.W_OK);
  await access(config.uploadsDir, constants.W_OK);
  await access(path.join(process.cwd(), "src", "templates", "invoice.html"), constants.R_OK).catch(
    async () => access(path.join(process.cwd(), "templates", "invoice.html"), constants.R_OK)
  );

  if (config.isProduction) {
    const chromePath = await resolveChromePath();
    await verifyChromeLaunch(chromePath);
  }

  process.stdout.write("Runtime validation passed\n");
}

main().catch((error) => {
  process.stderr.write(`Runtime validation failed: ${String(error)}\n`);
  process.exit(1);
});
