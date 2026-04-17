import fs from "node:fs";
import path from "node:path";

const releaseDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const requiredFiles = [
  "server.js",
  path.join(".next", "static"),
  path.join("public", "images", "brand", "ks-choco-house-logo.jpg"),
  path.join("public", "images", "brand", "fssai-logo.svg"),
  path.join("src", "templates", "invoice.html"),
  "scripts",
  "package.json",
  "package-lock.json",
];

const unexpectedPaths = [
  path.join("public", "public"),
  path.join("public", "public", "images"),
];

function assertExists(relativePath) {
  const absolutePath = path.join(releaseDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Release is missing required path: ${relativePath}`);
  }
}

function assertMissing(relativePath) {
  const absolutePath = path.join(releaseDir, relativePath);
  if (fs.existsSync(absolutePath)) {
    throw new Error(`Release contains unexpected nested path: ${relativePath}`);
  }
}

for (const requiredFile of requiredFiles) {
  assertExists(requiredFile);
}

for (const unexpectedPath of unexpectedPaths) {
  assertMissing(unexpectedPath);
}

process.stdout.write(`Release validation passed for ${releaseDir}\n`);
