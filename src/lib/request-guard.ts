import { NextResponse } from "next/server";
import { getCanonicalSiteUrl, getRuntimeConfig } from "@/lib/runtime-config";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request) {
  const headers = request.headers;
  const config = getRuntimeConfig();

  if (config.trustProxy) {
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0]?.trim() || "unknown";
    }
  }

  return headers.get("x-real-ip") || "unknown";
}

function getExpectedHost() {
  try {
    return new URL(getCanonicalSiteUrl()).host;
  } catch {
    return "";
  }
}

export function enforceAllowedOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return null;
  }

  const expectedOrigin = getCanonicalSiteUrl();
  const expectedHost = getExpectedHost();
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  if (origin) {
    if (origin !== expectedOrigin) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
    return null;
  }

  if (expectedHost && host && host !== expectedHost) {
    return NextResponse.json({ error: "Invalid request host" }, { status: 403 });
  }

  return null;
}

export function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now();
  const bucketKey = `${options.key}:${getClientIp(request)}`;
  const current = requestBuckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    requestBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (current.count >= options.limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))),
        },
      }
    );
  }

  current.count += 1;
  requestBuckets.set(bucketKey, current);
  return null;
}
