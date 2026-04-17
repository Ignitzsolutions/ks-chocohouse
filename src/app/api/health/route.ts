import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { validatePersistedDatabase } from "@/lib/db";
import { validateInvoiceRuntime } from "@/lib/invoice-runtime";
import { getRuntimeConfig } from "@/lib/runtime-config";

export async function GET() {
  try {
    const config = getRuntimeConfig();

    validatePersistedDatabase();
    await fs.mkdir(config.uploadsDir, { recursive: true });
    await fs.access(config.uploadsDir);
    await validateInvoiceRuntime({ allowInstall: false });

    return NextResponse.json({
      ok: true,
      status: "healthy",
      checks: {
        database: "ok",
        uploads: "ok",
        invoiceRuntime: "ok",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        error: process.env.NODE_ENV === "production" ? "Healthcheck failed" : String(error),
      },
      { status: 503 }
    );
  }
}
