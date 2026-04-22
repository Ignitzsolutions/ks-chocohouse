import { NextResponse } from "next/server";
import { requireAdminApi, requireAdminApiWithRequest } from "@/lib/admin-auth";
import {
  ADMIN_SETTINGS_ID,
  getAdminSettings,
  normalizeAdminSettings,
} from "@/lib/admin-settings";
import { jsonError } from "@/lib/api-response";
import { getDb, initDb } from "@/lib/db";

export async function GET() {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    return NextResponse.json({ settings: getAdminSettings(getDb()) });
  } catch (error) {
    return jsonError("Failed to load admin settings", 500, error);
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const nextSettings = normalizeAdminSettings({
      gstEnabled: body?.gstEnabled,
      gstRatePercent: body?.gstRatePercent,
      deliveryFeeAmount: body?.deliveryFeeAmount,
      freeDeliveryThreshold: body?.freeDeliveryThreshold,
    });
    const now = new Date().toISOString();

    getDb()
      .prepare(
        `UPDATE admin_settings
         SET gst_enabled = @gst_enabled,
             gst_rate_percent = @gst_rate_percent,
             delivery_fee_amount = @delivery_fee_amount,
             free_delivery_threshold = @free_delivery_threshold,
             updated_at = @updated_at
         WHERE id = @id`
      )
      .run({
        id: ADMIN_SETTINGS_ID,
        gst_enabled: nextSettings.gstEnabled ? 1 : 0,
        gst_rate_percent: nextSettings.gstRatePercent,
        delivery_fee_amount: nextSettings.deliveryFeeAmount,
        free_delivery_threshold: nextSettings.freeDeliveryThreshold,
        updated_at: now,
      });

    return NextResponse.json({
      ok: true,
      settings: {
        ...nextSettings,
        updatedAt: now,
      },
    });
  } catch (error) {
    return jsonError("Failed to update admin settings", 500, error);
  }
}
