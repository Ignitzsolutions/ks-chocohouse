import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { generateOrderBarcodePng } from "@/lib/barcode";
import {
  FULL_ADDRESS,
  PHONE_NUMBER_DISPLAY,
  SELLER_GSTIN,
  SELLER_LEGAL_NAME,
  SELLER_STATE_CODE,
  WHATSAPP_NUMBER,
} from "@/lib/brand";
import {
  assertInvoiceAvailable,
  getOrderById,
  OrderDocumentError,
} from "@/lib/order-documents";

type RawOrderItem = {
  name?: string;
  qty?: number;
  unitPrice?: number;
  lineTotal?: number;
  customizationNote?: string;
};

type InvoiceItem = {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  customizationNote?: string;
};

type OrderRow = {
  id: string;
  customer_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  pincode?: string;
  delivery_date?: string;
  delivery_slot?: string;
  status?: string;
  created_at?: string;
  paid_at?: string | null;
  txn_id?: string | null;
  invoice_number?: string | null;
  invoice_ready?: number | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_status?: string | null;
  source?: string | null;
  buyer_gst_json?: string | null;
  subtotal_amount?: number | null;
  delivery_fee_amount?: number | null;
  discount_amount?: number | null;
  coupon_code?: string | null;
  total_amount?: number;
  order_kind?: string | null;
  lifecycle_state?: string | null;
  parent_order_id?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
  cake_message?: string | null;
  cake_name?: string | null;
  quantity?: number | null;
  order_items_json?: string | null;
};

type BuyerGstRow = {
  businessName?: string;
  gstin?: string;
  billingAddress?: string;
};

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89; // A4
const FRAME_X = 24;
const FRAME_Y = 24;
const FRAME_WIDTH = PAGE_WIDTH - FRAME_X * 2;
const FRAME_HEIGHT = PAGE_HEIGHT - FRAME_Y * 2;
const CONTENT_X = 44;
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_X * 2;
const CONTENT_RIGHT = CONTENT_X + CONTENT_WIDTH;
const FOOTER_SAFE_TOP = 112;

const colorText = rgb(0.15, 0.15, 0.15);
const colorMuted = rgb(0.42, 0.42, 0.42);
const colorLine = rgb(0.88, 0.88, 0.88);
const colorPanel = rgb(0.985, 0.985, 0.985);
const colorAccent = rgb(0.2, 0.2, 0.2);


const formatInr = (value: number) => {
  const amount = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(value) ? value : 0));
  return `INR ${amount}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const safeNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const wrapText = (text: string, maxWidth: number, font: PDFFont, size: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = words[index];
  }
  lines.push(current);
  return lines;
};

const wrapMultilineText = (text: string, maxWidth: number, font: PDFFont, size: number) => {
  return text
    .split(/\r?\n/)
    .flatMap((line, index, all) => {
      const safeLine = line.trimEnd();
      const wrapped = wrapText(safeLine || " ", maxWidth, font, size);
      if (index === all.length - 1) return wrapped;
      return [...wrapped, ""];
    });
};

const drawWrappedLines = (params: {
  page: PDFPage;
  lines: string[];
  x: number;
  y: number;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  lineGap?: number;
}) => {
  const { page, lines, x, y, font, size, color, lineGap = 3 } = params;
  let cursor = y;
  lines.forEach((line) => {
    page.drawText(line, { x, y: cursor, size, font, color });
    cursor -= size + lineGap;
  });
  return cursor;
};

const truncateLines = (lines: string[], maxLines: number) => {
  if (lines.length <= maxLines) return lines;
  if (maxLines <= 1) return ["…"];
  return [...lines.slice(0, Math.max(1, maxLines - 1)), "…"];
};

const normalizeItems = (order: OrderRow) => {
  const parsed: RawOrderItem[] = (() => {
    try {
      const value = JSON.parse(order.order_items_json ?? "[]") as RawOrderItem[];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  })();

  const fromJson = parsed
    .map((item) => {
      const qty = Math.max(1, safeNumber(item.qty, 1));
      const lineTotal = safeNumber(item.lineTotal, safeNumber(item.unitPrice, 0) * qty);
      const unitPrice = safeNumber(item.unitPrice, qty ? lineTotal / qty : 0);
      const name = String(item.name ?? "").trim() || "Custom Order";
      return {
        name,
        qty,
        unitPrice,
        lineTotal,
        customizationNote: item.customizationNote?.trim() || undefined,
      } satisfies InvoiceItem;
    })
    .filter((item) => item.qty > 0);

  if (fromJson.length > 0) return fromJson;

  const fallbackName = String(order.cake_name ?? "").trim();
  if (fallbackName) {
    const qty = Math.max(1, safeNumber(order.quantity, 1));
    const total = safeNumber(order.total_amount, 0);
    return [
      {
        name: fallbackName,
        qty,
        unitPrice: qty ? total / qty : total,
        lineTotal: total,
      },
    ] satisfies InvoiceItem[];
  }

  return [] as InvoiceItem[];
};

const parseBuyerGst = (value?: string | null) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as BuyerGstRow;
    const businessName = String(parsed.businessName ?? "").trim();
    const gstin = String(parsed.gstin ?? "").trim();
    const billingAddress = String(parsed.billingAddress ?? "").trim();
    if (!businessName && !gstin && !billingAddress) {
      return null;
    }
    return { businessName, gstin, billingAddress };
  } catch {
    return null;
  }
};

const readBinaryIfExists = async (relativePath: string) => {
  try {
    return await readFile(path.join(process.cwd(), relativePath));
  } catch {
    return null;
  }
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId: rawOrderId } = await context.params;
    const orderId = decodeURIComponent(rawOrderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "Order id is required" }, { status: 400 });
    }

    const order = getOrderById(orderId) as OrderRow | undefined;
    assertInvoiceAvailable(order);

    const items = normalizeItems(order);
    const subtotalFromItems = items.reduce((sum, item) => sum + safeNumber(item.lineTotal), 0);
    const total = safeNumber(order.total_amount, 0);
    const taxAmount = 0;
    const subtotal =
      order.subtotal_amount != null
        ? safeNumber(order.subtotal_amount, subtotalFromItems)
        : subtotalFromItems;
    const deliveryFee =
      order.delivery_fee_amount != null
        ? safeNumber(order.delivery_fee_amount, Math.max(0, total - subtotalFromItems - taxAmount))
        : Math.max(0, total - subtotalFromItems - taxAmount);
    const discountAmount = safeNumber(order.discount_amount, 0);
    const buyerGst = parseBuyerGst(order.buyer_gst_json);

    const [bakeryLogoBytes, fssaiBytes] = await Promise.all([
      readBinaryIfExists("public/images/brand/ks-choco-house-logo.jpg"),
      readBinaryIfExists("public/images/brand/fssai-logo.png"),
    ]);
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fontBody = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBodyBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const bakeryLogo = bakeryLogoBytes ? await pdf.embedJpg(bakeryLogoBytes) : null;
    const fssaiLogo = fssaiBytes ? await pdf.embedPng(fssaiBytes) : null;
    const barcodeImage = await generateOrderBarcodePng(order.id, {
      includeText: true,
      scale: 2,
      height: 14,
    })
      .then((pngBytes) => pdf.embedPng(pngBytes))
      .catch((error) => {
        console.error(
          `[invoice] barcode embed failed for order ${order.id}: ${String(error)}`
        );
        return null;
      });

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    page.drawRectangle({
      x: FRAME_X,
      y: FRAME_Y,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      color: rgb(1, 1, 1),
      borderColor: colorLine,
      borderWidth: 1,
    });

    const drawRightText = (
      text: string,
      xRight: number,
      yPos: number,
      font: PDFFont,
      size: number,
      color: ReturnType<typeof rgb>
    ) => {
      const width = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: xRight - width, y: yPos, size, font, color });
    };

    const invoiceDate = formatDate(order.paid_at || order.created_at);
    const dueDate = formatDate(order.delivery_date);

    // Header
    const headerTop = PAGE_HEIGHT - 56;
    const logoSize = 40;
    if (bakeryLogo) {
      page.drawImage(bakeryLogo, {
        x: CONTENT_X,
        y: headerTop - logoSize + 4,
        width: logoSize,
        height: logoSize,
      });
    }

    const titleX = bakeryLogo ? CONTENT_X + logoSize + 12 : CONTENT_X;
    page.drawText("INVOICE", {
      x: titleX,
      y: headerTop,
      size: 30,
      font: fontBodyBold,
      color: colorText,
    });

    const metaRightX = CONTENT_RIGHT;
    const metaStartY = headerTop + 4;
    const metaLineGap = 14;
    const metaRows = [
      ["Invoice #", order.invoice_number],
      ["Date", invoiceDate],
      ["Due", dueDate],
    ] as const;
    let metaY = metaStartY;
    metaRows.forEach(([label, value]) => {
      page.drawText(`${label}:`, {
        x: CONTENT_RIGHT - 150,
        y: metaY,
        size: 9.6,
        font: fontBodyBold,
        color: colorMuted,
      });
      drawRightText(String(value || "-"), metaRightX, metaY, fontBody, 9.6, colorText);
      metaY -= metaLineGap;
    });

    const headerLineY = headerTop - 22;
    page.drawLine({
      start: { x: CONTENT_X, y: headerLineY },
      end: { x: CONTENT_RIGHT, y: headerLineY },
      thickness: 1.2,
      color: colorLine,
    });

    if (barcodeImage) {
      const maxBarcodeWidth = 180;
      const maxBarcodeHeight = 38;
      const scale = Math.min(
        maxBarcodeWidth / barcodeImage.width,
        maxBarcodeHeight / barcodeImage.height
      );
      const barcodeWidth = barcodeImage.width * scale;
      const barcodeHeight = barcodeImage.height * scale;
      const barcodeX = CONTENT_RIGHT - barcodeWidth;
      const barcodeY = headerLineY - 12 - barcodeHeight;
      page.drawImage(barcodeImage, {
        x: barcodeX,
        y: barcodeY,
        width: barcodeWidth,
        height: barcodeHeight,
      });
    }

    // Parties
    let cursorY = headerLineY - 40;
    const partyGap = 24;
    const partyWidth = (CONTENT_WIDTH - partyGap) / 2;
    const fromX = CONTENT_X;
    const toX = CONTENT_X + partyWidth + partyGap;
    const partyHeaderSize = 9.6;
    const partyLineSize = 9.6;
    const partyLineHeight = 12.4;

    page.drawText("From", {
      x: fromX,
      y: cursorY,
      size: partyHeaderSize,
      font: fontBodyBold,
      color: colorMuted,
    });
    page.drawText("To", {
      x: toX,
      y: cursorY,
      size: partyHeaderSize,
      font: fontBodyBold,
      color: colorMuted,
    });

    const buyerAddress = [order.address, order.pincode].filter(Boolean).join(", ");
    const sellerLinesSource = [
      SELLER_LEGAL_NAME,
      FULL_ADDRESS,
      `GSTIN: ${SELLER_GSTIN}`,
      `State Code: ${SELLER_STATE_CODE}`,
    ];
    const buyerLinesSource = [
      order.customer_name || "Customer",
      buyerAddress || "-",
      order.email || null,
      order.phone ? `Phone: ${order.phone}` : null,
      buyerGst?.businessName ? `GST Name: ${buyerGst.businessName}` : null,
      buyerGst?.gstin ? `GSTIN: ${buyerGst.gstin}` : null,
    ];

    const buildLines = (entries: Array<string | null>) =>
      entries
        .filter((entry): entry is string => Boolean(entry))
        .flatMap((entry) => wrapText(entry, partyWidth, fontBody, partyLineSize));

    const sellerLines = buildLines(sellerLinesSource);
    const buyerLines = buildLines(buyerLinesSource);

    const linesY = cursorY - 14;
    let sellerY = linesY;
    sellerLines.forEach((line) => {
      page.drawText(line, {
        x: fromX,
        y: sellerY,
        size: partyLineSize,
        font: fontBody,
        color: colorText,
      });
      sellerY -= partyLineHeight;
    });
    let buyerY = linesY;
    buyerLines.forEach((line) => {
      page.drawText(line, {
        x: toX,
        y: buyerY,
        size: partyLineSize,
        font: fontBody,
        color: colorText,
      });
      buyerY -= partyLineHeight;
    });

    const partyHeight = Math.max(sellerLines.length, buyerLines.length) * partyLineHeight;
    cursorY = linesY - partyHeight - 20;

    // Items table
    const tableX = CONTENT_X;
    const tableWidth = CONTENT_WIDTH;
    const headerHeight = 24;
    page.drawRectangle({
      x: tableX,
      y: cursorY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: rgb(0.965, 0.965, 0.965),
      borderColor: colorLine,
      borderWidth: 0.8,
    });

    const colDescX = tableX + 12;
    const qtyRightX = tableX + tableWidth - 180;
    const amountRightX = tableX + tableWidth - 12;

    page.drawText("Description", {
      x: colDescX,
      y: cursorY - 16,
      size: 9.6,
      font: fontBodyBold,
      color: colorMuted,
    });
    drawRightText("Qty", qtyRightX, cursorY - 16, fontBodyBold, 9.6, colorMuted);
    drawRightText("Amount", amountRightX, cursorY - 16, fontBodyBold, 9.6, colorMuted);

    cursorY -= headerHeight + 10;

    const itemRows = items.length > 0 ? items : [];
    let truncatedItems = false;
    const footerReserve = 96;
    const noteText = order.cake_message?.trim();
    const noteLines = noteText
      ? wrapMultilineText(noteText, CONTENT_WIDTH - 24, fontBody, 9.4)
      : [];
    const noteBoxHeight = noteLines.length ? Math.min(120, noteLines.length * 12 + 20) : 0;
    const totalsBoxWidth = 300;
    const totalsBoxHeight = 110;
    const postTableReserve = totalsBoxHeight + noteBoxHeight + 48;

    for (let index = 0; index < itemRows.length; index += 1) {
      const item = itemRows[index];
      const titleLines = wrapText(
        `${index + 1}. ${item.name}`,
        qtyRightX - colDescX - 16,
        fontBody,
        10
      );
      const noteLinesItem = item.customizationNote
        ? wrapMultilineText(item.customizationNote, qtyRightX - colDescX - 24, fontBody, 9)
        : [];

      const topPadding = 6;
      const bottomPadding = 6;
      const titleHeight = titleLines.length * 14;
      const noteHeight = noteLinesItem.length > 0 ? 4 + noteLinesItem.length * 12 : 0;
      const rowHeight = topPadding + titleHeight + noteHeight + bottomPadding;
      if (cursorY - rowHeight < FRAME_Y + footerReserve + postTableReserve) {
        truncatedItems = true;
        break;
      }

      if (index % 2 === 0) {
        page.drawRectangle({
          x: tableX,
          y: cursorY - rowHeight + 2,
          width: tableWidth,
          height: rowHeight - 2,
          color: rgb(0.995, 0.995, 0.995),
        });
      }

      let rowY = cursorY - topPadding;
      rowY = drawWrappedLines({
        page,
        lines: titleLines,
        x: colDescX,
        y: rowY,
        font: fontBody,
        size: 10,
        color: colorText,
        lineGap: 4,
      });

      if (noteLinesItem.length > 0) {
        rowY = drawWrappedLines({
          page,
          lines: noteLinesItem,
          x: colDescX + 8,
          y: rowY - 2,
          font: fontBody,
          size: 9,
          color: colorMuted,
          lineGap: 2.4,
        });
      }

      const numbersY = cursorY - 10;
      drawRightText(String(item.qty), qtyRightX, numbersY, fontBody, 9.8, colorText);
      drawRightText(formatInr(item.lineTotal), amountRightX, numbersY, fontBody, 9.8, colorText);

      cursorY -= rowHeight;
      page.drawLine({
        start: { x: tableX, y: cursorY + 3 },
        end: { x: tableX + tableWidth, y: cursorY + 3 },
        thickness: 0.6,
        color: colorLine,
      });
      cursorY -= 8;
    }

    if (itemRows.length === 0) {
      page.drawText("No item data recorded for this order.", {
        x: colDescX,
        y: cursorY,
        size: 9.4,
        font: fontBody,
        color: colorMuted,
      });
      cursorY -= 20;
    }

    if (truncatedItems) {
      page.drawText("Additional items continue in order record.", {
        x: colDescX,
        y: cursorY,
        size: 8.6,
        font: fontBody,
        color: colorMuted,
      });
      cursorY -= 14;
    }

    const totalsX = CONTENT_RIGHT - totalsBoxWidth;
    const totalsY = Math.max(
      FRAME_Y + footerReserve + noteBoxHeight + 24,
      cursorY - totalsBoxHeight - 12
    );
    page.drawRectangle({
      x: totalsX,
      y: totalsY,
      width: totalsBoxWidth,
      height: totalsBoxHeight,
      color: colorPanel,
      borderColor: colorLine,
      borderWidth: 0.8,
    });

    const drawAmount = (label: string, value: string, yy: number, bold = false) => {
      page.drawText(label, {
        x: totalsX + 12,
        y: yy,
        size: bold ? 11 : 9.6,
        font: bold ? fontBodyBold : fontBody,
        color: colorMuted,
      });
      drawRightText(
        value,
        totalsX + totalsBoxWidth - 12,
        yy,
        bold ? fontBodyBold : fontBody,
        bold ? 11 : 9.6,
        bold ? colorAccent : colorText
      );
    };

    drawAmount("Subtotal", formatInr(subtotal), totalsY + 78);
    drawAmount("Discount", formatInr(discountAmount), totalsY + 60);
    drawAmount("Tax", formatInr(taxAmount), totalsY + 42);
    drawAmount("Delivery Fee", formatInr(deliveryFee), totalsY + 24);
    drawAmount("Total", formatInr(total), totalsY + 6, true);

    if (noteBoxHeight > 0) {
      const notesY = totalsY - 24 - noteBoxHeight;
      page.drawRectangle({
        x: CONTENT_X,
        y: notesY,
        width: CONTENT_WIDTH,
        height: noteBoxHeight,
        color: rgb(0.975, 0.975, 0.975),
        borderColor: colorLine,
        borderWidth: 0.8,
      });
      const maxNoteLines = Math.floor((noteBoxHeight - 16) / 12.2);
      const clippedNoteLines = truncateLines(noteLines, Math.max(1, maxNoteLines));
      drawWrappedLines({
        page,
        lines: clippedNoteLines,
        x: CONTENT_X + 10,
        y: notesY + noteBoxHeight - 14,
        font: fontBody,
        size: 9.4,
        color: colorMuted,
        lineGap: 2.4,
      });
    }

    if ((order.lifecycle_state ?? "finalized") === "void") {
      page.drawText("VOID", {
        x: 170,
        y: 420,
        size: 76,
        font: fontBodyBold,
        color: rgb(0.84, 0.3, 0.3),
        rotate: degrees(-28),
        opacity: 0.16,
      });
    }

    // Footer
    const footerLineY = FRAME_Y + 86;
    page.drawLine({
      start: { x: CONTENT_X, y: footerLineY },
      end: { x: CONTENT_RIGHT, y: footerLineY },
      thickness: 0.8,
      color: colorLine,
    });

    const footerRightWidth = 120;
    const footerLeftWidth = CONTENT_WIDTH - footerRightWidth - 12;
    const footerLeftLines: string[] = [];
    if (order.order_kind === "return" && order.parent_order_id) {
      footerLeftLines.push(`Return Reference: ${order.parent_order_id}`);
    }
    footerLeftLines.push("Thank you for your order. Invoice generated after payment verification.");
    footerLeftLines.push(`Address: ${FULL_ADDRESS}`);
    footerLeftLines.push(`Contact: ${PHONE_NUMBER_DISPLAY}  |  WhatsApp: +${WHATSAPP_NUMBER}`);

    const wrappedFooterLines = footerLeftLines.flatMap((line) =>
      wrapText(line, footerLeftWidth, fontBody, 8.6)
    );
    let footerTextY = footerLineY - 12;
    wrappedFooterLines.forEach((line) => {
      page.drawText(line, {
        x: CONTENT_X,
        y: footerTextY,
        size: 8.6,
        font: fontBody,
        color: colorMuted,
      });
      footerTextY -= 11;
    });

    if (fssaiLogo) {
      const fssaiLogoWidth = 96;
      const fssaiLogoHeight = 30;
      const fssaiX = CONTENT_RIGHT - fssaiLogoWidth;
      const fssaiBottomY = FRAME_Y + 22;
      const fssaiLogoY = fssaiBottomY + 12;
      page.drawImage(fssaiLogo, {
        x: fssaiX,
        y: fssaiLogoY,
        width: fssaiLogoWidth,
        height: fssaiLogoHeight,
      });
      page.drawText("FSSAI No: 20124233000089", {
        x: fssaiX,
        y: fssaiBottomY,
        size: 7.6,
        font: fontBody,
        color: colorMuted,
      });
    }

    const pdfBytes = await pdf.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"invoice-${order.id}.pdf\"`,
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

    return NextResponse.json(
      { error: "Failed to generate invoice", details: String(error) },
      { status: 500 }
    );
  }
}
