import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { initDb, getDb } from "@/lib/db";
import {
  BRAND_NAME,
  LOCATION,
  PHONE_NUMBER_DISPLAY,
  WHATSAPP_NUMBER,
} from "@/lib/brand";

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
  total_amount?: number;
  cake_message?: string | null;
  cake_name?: string | null;
  quantity?: number | null;
  order_items_json?: string | null;
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

const colorText = rgb(0.16, 0.12, 0.1);
const colorMuted = rgb(0.42, 0.38, 0.34);
const colorLine = rgb(0.9, 0.87, 0.83);
const colorPanel = rgb(0.985, 0.98, 0.972);
const colorAccent = rgb(0.36, 0.17, 0.11);
const colorSoftDecor = rgb(0.96, 0.92, 0.88);

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

const drawFloralMotif = (page: PDFPage, centerX: number, centerY: number) => {
  const petals = [
    [0, 5],
    [4.5, 1.6],
    [2.7, -4.1],
    [-2.7, -4.1],
    [-4.5, 1.6],
  ];
  petals.forEach(([dx, dy]) => {
    page.drawCircle({
      x: centerX + dx,
      y: centerY + dy,
      size: 2.1,
      color: colorSoftDecor,
    });
  });
  page.drawCircle({
    x: centerX,
    y: centerY,
    size: 1.5,
    color: rgb(0.93, 0.86, 0.78),
  });
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
    const { orderId } = await context.params;
    if (!orderId) {
      return NextResponse.json({ error: "Order id is required" }, { status: 400 });
    }

    initDb();
    const order = getDb()
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(orderId) as OrderRow | undefined;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.invoice_number || Number(order.invoice_ready ?? 0) !== 1) {
      return NextResponse.json(
        {
          error: "Invoice is not available yet",
          details:
            "Invoice will be generated after payment verification and order acceptance.",
        },
        { status: 409 }
      );
    }

    const items = normalizeItems(order);
    const subtotalFromItems = items.reduce((sum, item) => sum + safeNumber(item.lineTotal), 0);
    const total = safeNumber(order.total_amount, 0);
    const taxAmount = 0;
    const deliveryFee = Math.max(0, total - subtotalFromItems - taxAmount);
    let subtotal = subtotalFromItems;
    if (subtotal === 0 && total > 0) {
      subtotal = Math.max(0, total - deliveryFee - taxAmount);
    }

    const [bakeryLogoBytes, fssaiBytes] = await Promise.all([
      readBinaryIfExists("public/images/brand/ks-choco-house-logo.jpg"),
      readBinaryIfExists("public/images/brand/fssai-logo.png"),
    ]);
    const [invoiceSansRegularBytes, invoiceSansBoldBytes] = await Promise.all([
      readBinaryIfExists("public/fonts/invoice/Arial.ttf"),
      readBinaryIfExists("public/fonts/invoice/Arial-Bold.ttf"),
    ]);

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fontSans = invoiceSansRegularBytes
      ? await pdf.embedFont(invoiceSansRegularBytes, { subset: true })
      : await pdf.embedFont(StandardFonts.Helvetica);
    const fontSansBold = invoiceSansBoldBytes
      ? await pdf.embedFont(invoiceSansBoldBytes, { subset: true })
      : await pdf.embedFont(StandardFonts.HelveticaBold);
    const fontScript = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

    const bakeryLogo = bakeryLogoBytes ? await pdf.embedJpg(bakeryLogoBytes) : null;
    const fssaiLogo = fssaiBytes ? await pdf.embedPng(fssaiBytes) : null;

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

    // Subtle decorative markers.
    [
      [FRAME_X + 16, FRAME_Y + FRAME_HEIGHT - 16],
      [FRAME_X + 30, FRAME_Y + FRAME_HEIGHT - 24],
      [FRAME_X + FRAME_WIDTH - 16, FRAME_Y + FRAME_HEIGHT - 16],
      [FRAME_X + FRAME_WIDTH - 30, FRAME_Y + FRAME_HEIGHT - 24],
    ].forEach(([x, y]) => {
      page.drawCircle({ x, y, size: 2.8, color: colorSoftDecor });
    });
    drawFloralMotif(page, FRAME_X + 44, FRAME_Y + FRAME_HEIGHT - 22);
    drawFloralMotif(page, FRAME_X + FRAME_WIDTH - 44, FRAME_Y + FRAME_HEIGHT - 22);

    let y = PAGE_HEIGHT - 52;

    const logoSize = 64;
    if (bakeryLogo) {
      page.drawImage(bakeryLogo, {
        x: CONTENT_X,
        y: y - logoSize + 6,
        width: logoSize,
        height: logoSize,
      });
    }

    const titleX = bakeryLogo ? CONTENT_X + logoSize + 12 : CONTENT_X;
    page.drawText(BRAND_NAME, {
      x: titleX,
      y,
      size: 30,
      font: fontScript,
      color: colorAccent,
    });
    y -= 28;

    page.drawText("Ultimate Chocolate Destination", {
      x: titleX,
      y,
      size: 10.5,
      font: fontSansBold,
      color: colorMuted,
    });
    y -= 16;
    page.drawText("Tax Invoice", {
      x: titleX,
      y,
      size: 11.5,
      font: fontSansBold,
      color: colorText,
    });

    const metaBoxWidth = 208;
    const metaBoxX = CONTENT_RIGHT - metaBoxWidth;
    const metaBoxY = PAGE_HEIGHT - 120;
    page.drawRectangle({
      x: metaBoxX,
      y: metaBoxY,
      width: metaBoxWidth,
      height: 78,
      color: colorPanel,
      borderColor: colorLine,
      borderWidth: 0.8,
    });

    const invoiceDate = formatDate(order.paid_at || order.created_at);
    const metaRows = [
      ["Invoice No", order.invoice_number],
      ["Order ID", order.id],
      ["Date", invoiceDate],
    ] as const;
    let metaY = metaBoxY + 58;
    metaRows.forEach(([label, value]) => {
      page.drawText(`${label}:`, {
        x: metaBoxX + 10,
        y: metaY,
        size: 9.8,
        font: fontSansBold,
        color: colorMuted,
      });
      page.drawText(String(value || "-"), {
        x: metaBoxX + 84,
        y: metaY,
        size: 9.8,
        font: fontSans,
        color: colorText,
      });
      metaY -= 18;
    });

    y = PAGE_HEIGHT - 148;
    page.drawLine({
      start: { x: CONTENT_X, y: y + 8 },
      end: { x: CONTENT_RIGHT, y: y + 8 },
      thickness: 0.8,
      color: colorLine,
    });

    const leftCardX = CONTENT_X;
    const cardGap = 12;
    const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
    const rightCardX = leftCardX + cardWidth + cardGap;

    const billingEntries = [
      `Bill To: ${order.customer_name || "Customer"}`,
      `Email: ${order.email || "-"}`,
      `Address: ${[order.address, order.pincode].filter(Boolean).join(", ") || "-"}`,
      `Delivery Date: ${formatDate(order.delivery_date)}`,
      `Time Slot: ${order.delivery_slot || "-"}`,
    ];
    const paymentEntries = [
      `Payment Status: ${order.payment_status || "-"}`,
      `Payment Method: ${order.payment_method || "-"}`,
      `Reference: ${order.payment_reference || order.txn_id || "-"}`,
      `Order Source: ${order.source || "online"}`,
      `Order Status: ${order.status || "-"}`,
    ];

    const measureEntries = (entries: string[]) =>
      entries.reduce((acc, entry) => {
        const wrapped = wrapText(entry, cardWidth - 20, fontSans, 9.8);
        return acc + wrapped.length * 12 + 3;
      }, 0);

    const cardBodyHeight = Math.max(measureEntries(billingEntries), measureEntries(paymentEntries));
    const cardHeight = Math.max(126, cardBodyHeight + 24);
    const cardsTop = y;

    [leftCardX, rightCardX].forEach((x) => {
      page.drawRectangle({
        x,
        y: cardsTop - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: colorPanel,
        borderColor: colorLine,
        borderWidth: 0.8,
      });
    });

    page.drawText("Billing Details", {
      x: leftCardX + 10,
      y: cardsTop - 16,
      size: 10.5,
      font: fontSansBold,
      color: colorText,
    });
    page.drawText("Payment & Order", {
      x: rightCardX + 10,
      y: cardsTop - 16,
      size: 10.5,
      font: fontSansBold,
      color: colorText,
    });

    let leftY = cardsTop - 32;
    billingEntries.forEach((entry) => {
      leftY = drawWrappedLines({
        page,
        lines: wrapText(entry, cardWidth - 20, fontSans, 9.8),
        x: leftCardX + 10,
        y: leftY,
        font: fontSans,
        size: 9.8,
        color: colorText,
        lineGap: 2.4,
      });
      leftY -= 1;
    });

    let rightY = cardsTop - 32;
    paymentEntries.forEach((entry) => {
      rightY = drawWrappedLines({
        page,
        lines: wrapText(entry, cardWidth - 20, fontSans, 9.8),
        x: rightCardX + 10,
        y: rightY,
        font: fontSans,
        size: 9.8,
        color: colorText,
        lineGap: 2.4,
      });
      rightY -= 1;
    });

    y = cardsTop - cardHeight - 18;

    // Items table
    const tableX = CONTENT_X;
    const tableWidth = CONTENT_WIDTH;
    const headerHeight = 28;
    page.drawRectangle({
      x: tableX,
      y: y - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: rgb(0.972, 0.958, 0.94),
      borderColor: colorLine,
      borderWidth: 0.8,
    });

    const colItemX = tableX + 12;
    const colQtyX = tableX + 336;
    const colPriceX = tableX + 392;
    const colTotalX = tableX + 456;

    page.drawText("Item", {
      x: colItemX,
      y: y - 19,
      size: 10,
      font: fontSansBold,
      color: colorMuted,
    });
    page.drawText("Qty", {
      x: colQtyX,
      y: y - 19,
      size: 10,
      font: fontSansBold,
      color: colorMuted,
    });
    page.drawText("Price", {
      x: colPriceX,
      y: y - 19,
      size: 10,
      font: fontSansBold,
      color: colorMuted,
    });
    page.drawText("Total", {
      x: colTotalX,
      y: y - 19,
      size: 10,
      font: fontSansBold,
      color: colorMuted,
    });

    y -= headerHeight + 10;

    const itemRows = items.length > 0 ? items : [];
    let truncatedItems = false;
    for (let index = 0; index < itemRows.length; index += 1) {
      const item = itemRows[index];
      const titleLines = wrapText(
        `${index + 1}. ${item.name}`,
        colQtyX - colItemX - 20,
        fontSans,
        10
      );
      const noteLines = item.customizationNote
        ? wrapText(
            `Customization: ${item.customizationNote}`,
            colQtyX - colItemX - 24,
            fontSans,
            9.2
          )
        : [];

      const topPadding = 8;
      const bottomPadding = 8;
      const titleHeight = titleLines.length * 14;
      const noteHeight = noteLines.length > 0 ? 4 + noteLines.length * 12 : 0;
      const rowHeight = topPadding + titleHeight + noteHeight + bottomPadding;
      if (y - rowHeight < FOOTER_SAFE_TOP) {
        truncatedItems = true;
        break;
      }

      if (index % 2 === 0) {
        page.drawRectangle({
          x: tableX,
          y: y - rowHeight + 2,
          width: tableWidth,
          height: rowHeight - 2,
          color: rgb(0.998, 0.996, 0.992),
        });
      }

      let rowY = y - topPadding;
      rowY = drawWrappedLines({
        page,
        lines: titleLines,
        x: colItemX,
        y: rowY,
        font: fontSans,
        size: 10,
        color: colorText,
        lineGap: 4,
      });

      if (noteLines.length > 0) {
        rowY = drawWrappedLines({
          page,
          lines: noteLines,
          x: colItemX + 8,
          y: rowY - 2,
          font: fontSans,
          size: 9.2,
          color: colorMuted,
          lineGap: 2.8,
        });
      }

      const numbersY = y - 10;
      page.drawText(String(item.qty), {
        x: colQtyX,
        y: numbersY,
        size: 10,
        font: fontSans,
        color: colorText,
      });
      page.drawText(formatInr(item.unitPrice), {
        x: colPriceX,
        y: numbersY,
        size: 10,
        font: fontSans,
        color: colorText,
      });
      page.drawText(formatInr(item.lineTotal), {
        x: colTotalX,
        y: numbersY,
        size: 10,
        font: fontSans,
        color: colorText,
      });

      y -= rowHeight;
      page.drawLine({
        start: { x: tableX, y: y + 3 },
        end: { x: tableX + tableWidth, y: y + 3 },
        thickness: 0.6,
        color: colorLine,
      });
      y -= 8;
    }

    if (itemRows.length === 0) {
      page.drawText("No item data recorded for this order.", {
        x: colItemX,
        y,
        size: 9.8,
        font: fontSans,
        color: colorMuted,
      });
      y -= 20;
    }

    if (truncatedItems) {
      page.drawText("Additional items continue in order record.", {
        x: colItemX,
        y,
        size: 8.6,
        font: fontSans,
        color: colorMuted,
      });
      y -= 14;
    }

    const totalsBoxWidth = 220;
    const totalsBoxHeight = 92;
    const totalsX = CONTENT_RIGHT - totalsBoxWidth;
    const totalsY = Math.max(FOOTER_SAFE_TOP + 8, y - totalsBoxHeight - 4);
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
        x: totalsX + 10,
        y: yy,
        size: bold ? 10.8 : 9.8,
        font: bold ? fontSansBold : fontSans,
        color: colorMuted,
      });
      const activeFont = bold ? fontSansBold : fontSans;
      const size = bold ? 10.8 : 9.8;
      const width = activeFont.widthOfTextAtSize(value, size);
      page.drawText(value, {
        x: totalsX + totalsBoxWidth - 10 - width,
        y: yy,
        size,
        font: activeFont,
        color: bold ? colorAccent : colorText,
      });
    };

    drawAmount("Subtotal", formatInr(subtotal), totalsY + 68);
    drawAmount("Tax", formatInr(taxAmount), totalsY + 50);
    drawAmount("Delivery Fee", formatInr(deliveryFee), totalsY + 32);
    drawAmount("Grand Total", formatInr(total), totalsY + 12, true);

    const noteText = order.cake_message?.trim();
    if (noteText) {
      const noteLines = wrapText(`Order Note: ${noteText}`, totalsX - CONTENT_X - 12, fontSans, 9.2);
      drawWrappedLines({
        page,
        lines: noteLines,
        x: CONTENT_X,
        y: totalsY + 46,
        font: fontSans,
        size: 9.2,
        color: colorMuted,
        lineGap: 2,
      });
    }

    // Footer
    const footerTop = FRAME_Y + 74;
    page.drawLine({
      start: { x: CONTENT_X, y: footerTop + 12 },
      end: { x: CONTENT_RIGHT, y: footerTop + 12 },
      thickness: 0.8,
      color: colorLine,
    });

    page.drawText("Thank you for your order. Invoice generated after payment verification.", {
      x: CONTENT_X,
      y: footerTop - 4,
      size: 8.8,
      font: fontSans,
      color: colorMuted,
    });
    page.drawText(`Address: ${LOCATION}`, {
      x: CONTENT_X,
      y: footerTop - 20,
      size: 8.8,
      font: fontSans,
      color: colorMuted,
    });
    page.drawText(`Contact: ${PHONE_NUMBER_DISPLAY}  |  WhatsApp: +${WHATSAPP_NUMBER}`, {
      x: CONTENT_X,
      y: footerTop - 36,
      size: 8.8,
      font: fontSans,
      color: colorMuted,
    });

    if (fssaiLogo) {
      page.drawImage(fssaiLogo, {
        x: CONTENT_RIGHT - 116,
        y: footerTop - 40,
        width: 104,
        height: 34.8,
      });
      page.drawText("FSSAI Validation", {
        x: CONTENT_RIGHT - 114,
        y: footerTop - 48,
        size: 7.8,
        font: fontSans,
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
    return NextResponse.json(
      { error: "Failed to generate invoice", details: String(error) },
      { status: 500 }
    );
  }
}
