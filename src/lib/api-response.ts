import { NextResponse } from "next/server";
import { isProductionEnvironment } from "@/lib/runtime-config";

export function errorDetails(error: unknown) {
  if (isProductionEnvironment()) return undefined;
  return String(error);
}

export function jsonError(message: string, status = 500, error?: unknown) {
  const details = errorDetails(error);
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}
