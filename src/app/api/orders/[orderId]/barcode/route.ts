import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import {
  generateOrderBarcodePng,
  normalizeOrderBarcodeOptions,
  type OrderBarcodeOptions,
} from "@/lib/barcode";
import {
  assertInvoiceAvailable,
  getOrderById,
  OrderDocumentError,
} from "@/lib/order-documents";

type OrderDocument = {
  id: string;
  invoice_number?: string | null;
  invoice_ready?: number | null;
};

function parseBoolFlag(value: string | null, defaultValue: boolean) {
  if (value === null) return defaultValue;
  return value !== "0";
}

function parseNumericQuery(
  value: string | null,
  key: keyof Pick<OrderBarcodeOptions, "scale" | "height">
) {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return { [key]: parsed } as Pick<OrderBarcodeOptions, "scale" | "height">;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId: rawOrderId } = await context.params;
    const orderId = decodeURIComponent(rawOrderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "Order id is required" }, { status: 400 });
    }

    const order = getOrderById(orderId) as OrderDocument | undefined;
    assertInvoiceAvailable(order);

    const { searchParams } = new URL(request.url);
    const includeText = parseBoolFlag(searchParams.get("includetext"), true);
    const scale = parseNumericQuery(searchParams.get("scale"), "scale");
    const height = parseNumericQuery(searchParams.get("height"), "height");
    const options = normalizeOrderBarcodeOptions({
      includeText,
      ...(scale ?? {}),
      ...(height ?? {}),
    });
    const png = await generateOrderBarcodePng(order.id, options);
    const pngBytes = new Uint8Array(png);

    const download = searchParams.get("download") === "1";
    const fileName = `barcode-${order.id}.png`;
    const disposition = download
      ? `attachment; filename="${fileName}"`
      : `inline; filename="${fileName}"`;

    return new NextResponse(pngBytes, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof OrderDocumentError) {
      return NextResponse.json(
        {
          error: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.status }
      );
    }

    return jsonError("Failed to generate barcode", 500, error);
  }
}
