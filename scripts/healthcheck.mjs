const targets = process.argv.slice(2);
if (targets.length === 0 && process.env.HEALTHCHECK_URL) {
  targets.push(process.env.HEALTHCHECK_URL);
}

if (targets.length === 0) {
  process.stderr.write("Usage: node scripts/healthcheck.mjs <url> [url...]\n");
  process.exit(1);
}

for (const target of targets) {
  const response = await fetch(target, {
    headers: {
      "cache-control": "no-cache",
    },
  });

  if (!response.ok) {
    process.stderr.write(`Check failed for ${target} with status ${response.status}\n`);
    process.exit(1);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (target.includes("/api/health") && !body?.ok) {
      process.stderr.write(`Healthcheck response was not healthy for ${target}\n`);
      process.exit(1);
    }
  }

  process.stdout.write(`Healthy: ${target}\n`);
}
