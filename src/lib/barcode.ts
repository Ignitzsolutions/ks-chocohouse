import bwipjs from "bwip-js";

const ORDER_ID_MAX_LENGTH = 64;
const DEFAULT_SCALE = 3;
const DEFAULT_HEIGHT = 16;
const MIN_SCALE = 1;
const MAX_SCALE = 6;
const MIN_HEIGHT = 8;
const MAX_HEIGHT = 48;

export type OrderBarcodeOptions = {
  includeText?: boolean;
  scale?: number;
  height?: number;
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function normalizeOrderBarcodeOptions(options?: OrderBarcodeOptions) {
  return {
    includeText: options?.includeText ?? true,
    scale: clampInt(options?.scale, MIN_SCALE, MAX_SCALE, DEFAULT_SCALE),
    height: clampInt(options?.height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT),
  };
}

export async function generateOrderBarcodePng(
  orderId: string,
  options?: OrderBarcodeOptions
) {
  const normalizedOrderId = String(orderId ?? "").trim();
  if (!normalizedOrderId) {
    throw new Error("Order id is required for barcode generation");
  }
  if (normalizedOrderId.length > ORDER_ID_MAX_LENGTH) {
    throw new Error("Order id is too long for barcode generation");
  }

  const normalizedOptions = normalizeOrderBarcodeOptions(options);
  return bwipjs.toBuffer({
    bcid: "code128",
    text: normalizedOrderId,
    scale: normalizedOptions.scale,
    height: normalizedOptions.height,
    includetext: normalizedOptions.includeText,
    textxalign: "center",
    backgroundcolor: "FFFFFF",
    paddingwidth: 10,
    paddingheight: 8,
  });
}
