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
      discountEnabled: body?.discountEnabled,
      gstEnabled: body?.gstEnabled,
      gstRatePercent: body?.gstRatePercent,
      cgstEnabled: body?.cgstEnabled,
      cgstRatePercent: body?.cgstRatePercent,
      sgstEnabled: body?.sgstEnabled,
      sgstRatePercent: body?.sgstRatePercent,
      deliveryFeeEnabled: body?.deliveryFeeEnabled,
      deliveryFeeAmount: body?.deliveryFeeAmount,
      freeDeliveryThreshold: body?.freeDeliveryThreshold,
      shippingIgstEnabled: body?.shippingIgstEnabled,
      shippingIgstRatePercent: body?.shippingIgstRatePercent,
    });
    const now = new Date().toISOString();

    getDb()
      .prepare(
        `UPDATE admin_settings
         SET gst_enabled = @gst_enabled,
             gst_rate_percent = @gst_rate_percent,
             discount_enabled = @discount_enabled,
             cgst_enabled = @cgst_enabled,
             cgst_rate_percent = @cgst_rate_percent,
             sgst_enabled = @sgst_enabled,
             sgst_rate_percent = @sgst_rate_percent,
             delivery_fee_enabled = @delivery_fee_enabled,
             delivery_fee_amount = @delivery_fee_amount,
             free_delivery_threshold = @free_delivery_threshold,
             shipping_igst_enabled = @shipping_igst_enabled,
             shipping_igst_rate_percent = @shipping_igst_rate_percent,
             updated_at = @updated_at
         WHERE id = @id`
      )
      .run({
        id: ADMIN_SETTINGS_ID,
        discount_enabled: nextSettings.discountEnabled ? 1 : 0,
        gst_enabled: nextSettings.gstEnabled ? 1 : 0,
        gst_rate_percent: nextSettings.gstRatePercent,
        cgst_enabled: nextSettings.cgstEnabled ? 1 : 0,
        cgst_rate_percent: nextSettings.cgstRatePercent,
        sgst_enabled: nextSettings.sgstEnabled ? 1 : 0,
        sgst_rate_percent: nextSettings.sgstRatePercent,
        delivery_fee_enabled: nextSettings.deliveryFeeEnabled ? 1 : 0,
        delivery_fee_amount: nextSettings.deliveryFeeAmount,
        free_delivery_threshold: nextSettings.freeDeliveryThreshold,
        shipping_igst_enabled: nextSettings.shippingIgstEnabled ? 1 : 0,
        shipping_igst_rate_percent: nextSettings.shippingIgstRatePercent,
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
