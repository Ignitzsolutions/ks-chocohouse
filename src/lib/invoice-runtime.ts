import { existsSync } from "node:fs";
import { access, constants } from "node:fs/promises";
import path from "node:path";
import {
  Browser,
  BrowserTag,
  detectBrowserPlatform,
  install,
  computeExecutablePath,
  resolveBuildId,
} from "@puppeteer/browsers";
import puppeteer from "puppeteer";
import { getRuntimeConfig } from "@/lib/runtime-config";

const PUPPETEER_CHROME_BUILD_ID = (
  puppeteer as typeof puppeteer & {
    PUPPETEER_REVISIONS?: { chrome?: string };
  }
).PUPPETEER_REVISIONS?.chrome;

export function getInvoiceTemplatePath() {
  const configured = process.env.INVOICE_TEMPLATE_PATH?.trim();
  if (configured) return configured;

  const candidates = [
    path.join(process.cwd(), "src", "templates", "invoice.html"),
    path.join(process.cwd(), "templates", "invoice.html"),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? candidates[0];
}

export function getPuppeteerCacheDir() {
  return path.join(process.cwd(), ".cache", "puppeteer");
}

export async function ensureInvoiceTemplateReadable() {
  await access(getInvoiceTemplatePath(), constants.R_OK);
}

export async function ensureChromeExecutablePath(options?: { allowInstall?: boolean }) {
  const allowInstall = options?.allowInstall ?? !getRuntimeConfig().isProduction;
  const configuredExecutablePath = getRuntimeConfig().chromeExecutablePath;
  const attemptedPaths: string[] = [];

  if (configuredExecutablePath) {
    if (existsSync(configuredExecutablePath)) {
      return configuredExecutablePath;
    }
    attemptedPaths.push(configuredExecutablePath);
  }

  try {
    const bundledExecutablePath = puppeteer.executablePath();
    if (bundledExecutablePath && existsSync(bundledExecutablePath)) {
      return bundledExecutablePath;
    }
    if (bundledExecutablePath) {
      attemptedPaths.push(bundledExecutablePath);
    }
  } catch {
    // Fall through.
  }

  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error("Unable to detect a supported platform for Chrome");
  }

  const buildId =
    PUPPETEER_CHROME_BUILD_ID ??
    (await resolveBuildId(Browser.CHROME, platform, BrowserTag.STABLE));
  const executablePath = computeExecutablePath({
    cacheDir: getPuppeteerCacheDir(),
    browser: Browser.CHROME,
    buildId,
    platform,
  });

  if (existsSync(executablePath)) {
    return executablePath;
  }

  attemptedPaths.push(executablePath);

  if (!allowInstall) {
    throw new Error(
      `Chrome executable not found. Checked: ${attemptedPaths.join(" -> ")}`
    );
  }

  await install({
    cacheDir: getPuppeteerCacheDir(),
    browser: Browser.CHROME,
    buildId,
    platform,
    unpack: true,
  });

  if (!existsSync(executablePath)) {
    throw new Error(
      `Browser install completed but executable was still not found. Checked: ${attemptedPaths.join(" -> ")}`
    );
  }

  return executablePath;
}

export async function getPuppeteerLaunchOptions() {
  const executablePath = await ensureChromeExecutablePath();
  return {
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
    ],
  } satisfies Parameters<typeof puppeteer.launch>[0];
}

export async function validateInvoiceRuntime(options?: { allowInstall?: boolean }) {
  await ensureInvoiceTemplateReadable();
  await ensureChromeExecutablePath({ allowInstall: options?.allowInstall });
}
