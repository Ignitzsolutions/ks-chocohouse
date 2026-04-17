import fs from "node:fs/promises";
import path from "node:path";
import { getRuntimeConfig } from "@/lib/runtime-config";

export function getUploadsDir() {
  return getRuntimeConfig().uploadsDir;
}

export function getPublicUploadsBaseUrl() {
  return getRuntimeConfig().publicUploadsBaseUrl;
}

export async function ensureUploadsDir() {
  await fs.mkdir(getUploadsDir(), { recursive: true });
}

export function buildUploadedAssetUrl(fileName: string) {
  const sanitized = path.basename(fileName);
  return `${getPublicUploadsBaseUrl()}/${sanitized}`;
}

export function resolveUploadedAssetPath(fileName: string) {
  return path.join(getUploadsDir(), path.basename(fileName));
}
