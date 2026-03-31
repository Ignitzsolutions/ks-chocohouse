import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  Browser,
  BrowserTag,
  detectBrowserPlatform,
  install,
  computeExecutablePath,
  resolveBuildId,
} from "@puppeteer/browsers";
import puppeteer from "puppeteer";
import { generateOrderBarcodePng } from "@/lib/barcode";
import {
  BRAND_NAME,
  FULL_ADDRESS,
  PHONE_NUMBER_DISPLAY,
  SELLER_GSTIN,
  SELLER_LEGAL_NAME,
  SELLER_STATE_CODE,
  TAGLINE,
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
  sizeLabel?: string;
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
  sale_date?: string | null;
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

const INVOICE_TEMPLATE_PATH = path.join(process.cwd(), "src/templates/invoice.html");
const PUPPETEER_CACHE_DIR = path.join(process.cwd(), ".cache", "puppeteer");
const PUPPETEER_CHROME_BUILD_ID = (
  puppeteer as typeof puppeteer & {
    PUPPETEER_REVISIONS?: { chrome?: string };
  }
).PUPPETEER_REVISIONS?.chrome;

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

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toDataUri = (bytes: Buffer, mimeType: string) =>
  `data:${mimeType};base64,${bytes.toString("base64")}`;

const parseBuyerGst = (value?: string | null) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as BuyerGstRow;
    const businessName = String(parsed.businessName ?? "").trim();
    const gstin = String(parsed.gstin ?? "").trim();
    const billingAddress = String(parsed.billingAddress ?? "").trim();
    if (!businessName && !gstin && !billingAddress) return null;
    return { businessName, gstin, billingAddress };
  } catch {
    return null;
  }
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
      const baseName = String(item.name ?? "").trim() || "Custom Order";
      const sizeLabel = String(item.sizeLabel ?? "").trim();
      const name =
        sizeLabel && !baseName.includes(sizeLabel)
          ? `${baseName} (${sizeLabel})`
          : baseName;
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
  if (!fallbackName) return [] as InvoiceItem[];

  const qty = Math.max(1, safeNumber(order.quantity, 1));
  const total = safeNumber(order.total_amount, 0);
  return [
    {
      name: fallbackName,
      qty,
      unitPrice: qty ? total / qty : total,
      lineTotal: total,
      customizationNote: order.cake_message?.trim() || undefined,
    },
  ] satisfies InvoiceItem[];
};

const renderTemplate = (template: string, replacements: Record<string, string>) =>
  Object.entries(replacements).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template
  );

const readBinaryIfExists = async (relativePath: string) => {
  try {
    return await readFile(path.join(process.cwd(), relativePath));
  } catch {
    return null;
  }
};

const wrapPdfText = (text: string, font: PDFFont, fontSize: number, maxWidth: number) => {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
};

const drawPdfLines = (
  page: PDFPage,
  lines: string[],
  x: number,
  y: number,
  options: {
    font: PDFFont;
    size: number;
    color?: ReturnType<typeof rgb>;
    lineHeight?: number;
  }
) => {
  const lineHeight = options.lineHeight ?? options.size * 1.35;
  let currentY = y;
  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      font: options.font,
      size: options.size,
      color: options.color ?? rgb(0.12, 0.09, 0.07),
    });
    currentY -= lineHeight;
  }
  return currentY;
};

const buildInvoicePdfFallback = async (input: {
  order: OrderRow;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  buyerGst: ReturnType<typeof parseBuyerGst>;
}) => {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 40;
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const muted = rgb(0.36, 0.24, 0.18);
  const textColor = rgb(0.12, 0.09, 0.07);
  const lineColor = rgb(0.9, 0.88, 0.85);
  let cursorY = pageHeight - margin;

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY - heightNeeded > margin) return;
    page = pdf.addPage([595.28, 841.89]);
    cursorY = pageHeight - margin;
  };

  const drawRule = () => {
    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: pageWidth - margin, y: cursorY },
      thickness: 1,
      color: lineColor,
    });
    cursorY -= 14;
  };

  const drawLabelValue = (label: string, value: string) => {
    ensureSpace(28);
    page.drawText(label, { x: margin, y: cursorY, font: bold, size: 9, color: muted });
    page.drawText(value, {
      x: margin + 110,
      y: cursorY,
      font: regular,
      size: 10,
      color: textColor,
    });
    cursorY -= 16;
  };

  page.drawText(BRAND_NAME, {
    x: margin,
    y: cursorY,
    font: bold,
    size: 22,
    color: textColor,
  });
  page.drawText(TAGLINE, {
    x: margin,
    y: cursorY - 22,
    font: regular,
    size: 10,
    color: muted,
  });
  page.drawText(`Invoice ${input.order.invoice_number || `INV-${input.order.id}`}`, {
    x: pageWidth - margin - 180,
    y: cursorY,
    font: bold,
    size: 16,
    color: textColor,
  });
  page.drawText(`Order ID: ${input.order.id}`, {
    x: pageWidth - margin - 180,
    y: cursorY - 18,
    font: regular,
    size: 10,
    color: muted,
  });
  cursorY -= 42;
  drawRule();

  const sellerBlock = wrapPdfText(
    [
      SELLER_LEGAL_NAME,
      FULL_ADDRESS,
      `Phone: ${PHONE_NUMBER_DISPLAY}`,
      `WhatsApp: +${WHATSAPP_NUMBER}`,
      `GSTIN: ${SELLER_GSTIN}`,
      `State Code: ${SELLER_STATE_CODE}`,
    ]
      .filter(Boolean)
      .join("\n"),
    regular,
    10,
    contentWidth / 2 - 10
  );

  const buyerLines = [
    input.order.customer_name || "Customer",
    [input.order.address, input.order.pincode].filter(Boolean).join(", "),
    input.order.phone ? `Phone: ${input.order.phone}` : "",
    input.order.email || "",
    input.buyerGst?.businessName ? `GST Name: ${input.buyerGst.businessName}` : "",
    input.buyerGst?.gstin ? `GSTIN: ${input.buyerGst.gstin}` : "",
    input.buyerGst?.billingAddress ? `GST Address: ${input.buyerGst.billingAddress}` : "",
  ].filter(Boolean);
  const buyerBlock = wrapPdfText(buyerLines.join("\n"), regular, 10, contentWidth / 2 - 10);

  ensureSpace(Math.max(sellerBlock.length, buyerBlock.length) * 14 + 30);
  page.drawText("From", { x: margin, y: cursorY, font: bold, size: 11, color: muted });
  page.drawText("Bill To", {
    x: margin + contentWidth / 2 + 10,
    y: cursorY,
    font: bold,
    size: 11,
    color: muted,
  });
  cursorY -= 16;
  drawPdfLines(page, sellerBlock, margin, cursorY, { font: regular, size: 10, color: textColor });
  drawPdfLines(page, buyerBlock, margin + contentWidth / 2 + 10, cursorY, {
    font: regular,
    size: 10,
    color: textColor,
  });
  cursorY -= Math.max(sellerBlock.length, buyerBlock.length) * 14 + 8;
  drawRule();

  drawLabelValue(
    "Invoice Date",
    formatDate(
      input.order.source === "offline" && input.order.sale_date
        ? input.order.sale_date
        : input.order.paid_at || input.order.created_at
    )
  );
  drawLabelValue("Delivery Date", formatDate(input.order.delivery_date));
  drawLabelValue("Payment Method", input.order.payment_method || "-");
  drawLabelValue("Payment Status", input.order.payment_status || "-");
  if (input.order.payment_reference || input.order.txn_id) {
    drawLabelValue(
      "Payment Ref",
      input.order.payment_reference || input.order.txn_id || "-"
    );
  }
  drawRule();

  ensureSpace(32);
  page.drawText("Item", { x: margin, y: cursorY, font: bold, size: 10, color: muted });
  page.drawText("Qty", {
    x: pageWidth - margin - 130,
    y: cursorY,
    font: bold,
    size: 10,
    color: muted,
  });
  page.drawText("Amount", {
    x: pageWidth - margin - 60,
    y: cursorY,
    font: bold,
    size: 10,
    color: muted,
  });
  cursorY -= 14;
  drawRule();

  for (const item of input.items) {
    const itemLines = wrapPdfText(item.name, bold, 10, contentWidth - 150);
    const noteLines = item.customizationNote
      ? wrapPdfText(item.customizationNote, regular, 9, contentWidth - 150)
      : [];
    const blockHeight = (itemLines.length + noteLines.length) * 13 + 8;
    ensureSpace(blockHeight + 10);

    drawPdfLines(page, itemLines, margin, cursorY, { font: bold, size: 10, color: textColor });
    if (noteLines.length > 0) {
      drawPdfLines(page, noteLines, margin, cursorY - itemLines.length * 13, {
        font: regular,
        size: 9,
        color: muted,
        lineHeight: 12,
      });
    }
    page.drawText(String(item.qty), {
      x: pageWidth - margin - 120,
      y: cursorY,
      font: regular,
      size: 10,
      color: textColor,
    });
    page.drawText(formatInr(item.lineTotal), {
      x: pageWidth - margin - 60,
      y: cursorY,
      font: regular,
      size: 10,
      color: textColor,
    });
    cursorY -= blockHeight;
    drawRule();
  }

  const totalsX = pageWidth - margin - 180;
  const drawTotalRow = (label: string, value: string, emphasize = false) => {
    ensureSpace(20);
    page.drawText(label, {
      x: totalsX,
      y: cursorY,
      font: emphasize ? bold : regular,
      size: 10,
      color: emphasize ? textColor : muted,
    });
    page.drawText(value, {
      x: pageWidth - margin - 60,
      y: cursorY,
      font: emphasize ? bold : regular,
      size: 10,
      color: textColor,
    });
    cursorY -= 16;
  };

  drawTotalRow("Subtotal", formatInr(input.subtotal));
  drawTotalRow("Discount", formatInr(input.discountAmount));
  drawTotalRow("Tax", formatInr(input.taxAmount));
  drawTotalRow("Delivery", formatInr(input.deliveryFee));
  drawTotalRow("Total", formatInr(input.total), true);

  const noteSections = [
    input.order.cake_message?.trim() ? `Message / Note\n${input.order.cake_message.trim()}` : "",
    input.order.void_reason ? `Void Reason\n${input.order.void_reason}` : "",
  ].filter(Boolean);

  if (noteSections.length > 0) {
    cursorY -= 8;
    drawRule();
    ensureSpace(60);
    page.drawText("Notes", { x: margin, y: cursorY, font: bold, size: 11, color: muted });
    cursorY -= 16;
    const noteLines = wrapPdfText(noteSections.join("\n\n"), regular, 10, contentWidth);
    cursorY = drawPdfLines(page, noteLines, margin, cursorY, {
      font: regular,
      size: 10,
      color: textColor,
    });
  }

  const footer = wrapPdfText(
    [
      "Thank you for choosing K S Choco House.",
      `Address: ${FULL_ADDRESS}`,
      `Contact: ${PHONE_NUMBER_DISPLAY} | WhatsApp: +${WHATSAPP_NUMBER}`,
    ].join("\n"),
    regular,
    9,
    contentWidth
  );

  ensureSpace(footer.length * 12 + 20);
  cursorY -= 8;
  drawRule();
  drawPdfLines(page, footer, margin, cursorY, { font: regular, size: 9, color: muted });

  return await pdf.save();
};

const ensureChromeExecutablePath = async () => {
  const configuredExecutablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
    process.env.CHROME_EXECUTABLE_PATH?.trim() ||
    undefined;
  const attemptedPaths: string[] = [];

  if (configuredExecutablePath) {
    if (existsSync(configuredExecutablePath)) {
      return configuredExecutablePath;
    }
    attemptedPaths.push(configuredExecutablePath);
  }

  try {
    const bundledExecutablePath = puppeteer.executablePath();
    if (bundledExecutablePath && existsSync(bundledExecutablePath)) {
      return bundledExecutablePath;
    }
    if (bundledExecutablePath) {
      attemptedPaths.push(bundledExecutablePath);
    }
  } catch {
    // Fall through to on-demand installation when Puppeteer has no usable local browser.
  }

  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error("Unable to detect a supported platform for Chrome installation");
  }

  const buildId =
    PUPPETEER_CHROME_BUILD_ID ??
    (await resolveBuildId(Browser.CHROME, platform, BrowserTag.STABLE));
  const executablePath = computeExecutablePath({
    cacheDir: PUPPETEER_CACHE_DIR,
    browser: Browser.CHROME,
    buildId,
    platform,
  });

  if (!existsSync(executablePath)) {
    attemptedPaths.push(executablePath);
    await install({
      cacheDir: PUPPETEER_CACHE_DIR,
      browser: Browser.CHROME,
      buildId,
      platform,
      unpack: true,
    });
  }

  if (!existsSync(executablePath)) {
    throw new Error(
      `Browser install completed but executable was still not found. Checked: ${attemptedPaths.join(" -> ")}`
    );
  }

  return executablePath;
};

const getLaunchOptions = async () => {
  const executablePath = await ensureChromeExecutablePath();
  return {
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
    ],
  } satisfies Parameters<typeof puppeteer.launch>[0];
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

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
        ? safeNumber(order.delivery_fee_amount, Math.max(0, total - subtotal + safeNumber(order.discount_amount, 0)))
        : Math.max(0, total - subtotal + safeNumber(order.discount_amount, 0));
    const discountAmount = safeNumber(order.discount_amount, 0);
    const buyerGst = parseBuyerGst(order.buyer_gst_json);

    const [template, bakeryLogoBytes, fssaiBytes, barcodeBytes] = await Promise.all([
      readFile(INVOICE_TEMPLATE_PATH, "utf8"),
      readBinaryIfExists("public/images/brand/ks-choco-house-logo.jpg"),
      readBinaryIfExists("public/images/brand/fssai-logo.png"),
      generateOrderBarcodePng(order.id, {
        includeText: true,
        scale: 2,
        height: 14,
      }).catch(() => null),
    ]);

    const badgeValues = [
      order.source ? `Source: ${order.source}` : "",
      order.coupon_code ? `Coupon: ${order.coupon_code}` : "",
      order.order_kind === "return" ? "Return Order" : "Sale Order",
      (order.lifecycle_state ?? "finalized") === "void" ? "Void" : "",
    ].filter(Boolean);

    const badges = badgeValues
      .map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`)
      .join("");

    const senderLines = [
      FULL_ADDRESS,
      `Phone: ${PHONE_NUMBER_DISPLAY}`,
      `WhatsApp: +${WHATSAPP_NUMBER}`,
      `GSTIN: ${SELLER_GSTIN}`,
      `State Code: ${SELLER_STATE_CODE}`,
    ]
      .filter(Boolean)
      .map((line) => escapeHtml(line))
      .join("\n");

    const buyerAddress = [order.address, order.pincode].filter(Boolean).join(", ");
    const receiverLines = [
      buyerAddress || "-",
      order.email || "",
      order.phone ? `Phone: ${order.phone}` : "",
      buyerGst?.businessName ? `GST Name: ${buyerGst.businessName}` : "",
      buyerGst?.gstin ? `GSTIN: ${buyerGst.gstin}` : "",
      buyerGst?.billingAddress ? `GST Address: ${buyerGst.billingAddress}` : "",
    ]
      .filter(Boolean)
      .map((line) => escapeHtml(line))
      .join("\n");

    const itemRows = items
      .map((item, index) => {
        const note = item.customizationNote?.trim()
          ? `<div class="item-note">${escapeHtml(item.customizationNote.trim())}</div>`
          : "";
        return `
          <tr class="item${index === items.length - 1 ? " last" : ""}">
            <td>
              <div class="item-title">${escapeHtml(item.name)}</div>
              ${note}
            </td>
            <td class="right">${escapeHtml(String(item.qty))}</td>
            <td class="right">${escapeHtml(formatInr(item.lineTotal))}</td>
          </tr>
        `;
      })
      .join("");

    const itemNotes = items
      .filter((item) => item.customizationNote?.trim())
      .map(
        (item, index) =>
          `Item ${index + 1} - ${item.name}\n${item.customizationNote?.trim() ?? ""}`
      );
    const noteSections = [
      order.cake_message?.trim() ? `Customization / Message\n${order.cake_message.trim()}` : "",
      itemNotes.length > 0 ? itemNotes.join("\n\n") : "",
      order.parent_order_id ? `Parent Order Reference\n${order.parent_order_id}` : "",
      order.void_reason ? `Void Reason\n${order.void_reason}` : "",
    ].filter(Boolean);

    const notesBlock = noteSections.length
      ? `
        <div class="notes">
          <strong>Notes</strong>
          <div class="notes-body">${escapeHtml(noteSections.join("\n\n"))}</div>
        </div>
      `
      : "";

    const barcodeBlock =
      barcodeBytes != null
        ? `
          <div class="barcode-wrap">
            <img src="${toDataUri(barcodeBytes, "image/png")}" alt="Order barcode" />
          </div>
        `
        : "";

    const fssaiBlock =
      fssaiBytes != null
        ? `
          <img src="${toDataUri(fssaiBytes, "image/png")}" alt="FSSAI logo" />
          <div>FSSAI No: 20124233000089</div>
        `
        : `<div>FSSAI No: 20124233000089</div>`;

    const footerLines = [
      "Thank you for choosing K S Choco House.",
      `Address: ${FULL_ADDRESS}`,
      `Contact: ${PHONE_NUMBER_DISPLAY} | WhatsApp: +${WHATSAPP_NUMBER}`,
      order.payment_reference || order.txn_id
        ? `Payment Reference: ${order.payment_reference || order.txn_id}`
        : "",
    ]
      .filter(Boolean)
      .map((line) => escapeHtml(line))
      .join("\n");

    const html = renderTemplate(template, {
      LOGO_SRC: bakeryLogoBytes ? toDataUri(bakeryLogoBytes, "image/jpeg") : "",
      BRAND_NAME: escapeHtml(BRAND_NAME),
      BRAND_SUBTITLE: escapeHtml(TAGLINE),
      BADGES: badges,
      INVOICE_NUMBER: escapeHtml(order.invoice_number || `INV-${order.id}`),
      ORDER_ID: escapeHtml(order.id),
      CREATED_DATE: escapeHtml(
        formatDate(
          order.source === "offline" && order.sale_date
            ? order.sale_date
            : order.paid_at || order.created_at
        )
      ),
      DUE_DATE: escapeHtml(formatDate(order.delivery_date)),
      PAYMENT_METHOD: escapeHtml(order.payment_method || "-"),
      PAYMENT_STATUS: escapeHtml(order.payment_status || "-"),
      BARCODE_BLOCK: barcodeBlock,
      SENDER_NAME: escapeHtml(SELLER_LEGAL_NAME),
      SENDER_LINES: senderLines,
      RECEIVER_NAME: escapeHtml(order.customer_name || "Customer"),
      RECEIVER_LINES: receiverLines,
      ITEM_ROWS:
        itemRows ||
        `<tr class="item last"><td><div class="item-title">No item data recorded.</div></td><td class="right">-</td><td class="right">-</td></tr>`,
      SUBTOTAL: escapeHtml(formatInr(subtotal)),
      DISCOUNT: escapeHtml(formatInr(discountAmount)),
      TAX: escapeHtml(formatInr(taxAmount)),
      DELIVERY_FEE: escapeHtml(formatInr(deliveryFee)),
      TOTAL: escapeHtml(formatInr(total)),
      NOTES_BLOCK: notesBlock,
      FOOTER_TEXT: footerLines,
      FSSAI_BLOCK: fssaiBlock,
    });

    let pdfBytes: Uint8Array;
    try {
      browser = await puppeteer.launch(await getLaunchOptions());
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.emulateMediaType("screen");

      pdfBytes = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });
    } catch {
      pdfBytes = await buildInvoicePdfFallback({
        order,
        items,
        subtotal,
        discountAmount,
        taxAmount,
        deliveryFee,
        total,
        buyerGst,
      });
    }

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
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
