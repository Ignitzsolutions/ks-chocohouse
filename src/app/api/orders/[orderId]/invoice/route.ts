import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { jsonError } from "@/lib/api-response";
import { generateOrderBarcodePng } from "@/lib/barcode";
import {
  BRAND_LOGO_FILE_PATH,
  BRAND_LOGO_MIME_TYPE,
  BRAND_NAME,
  FULL_ADDRESS,
  PHONE_NUMBER_DISPLAY,
  SELLER_GSTIN,
  SELLER_LEGAL_NAME,
  TAGLINE,
  WHATSAPP_NUMBER,
} from "@/lib/brand";
import {
  assertInvoiceAvailable,
  getOrderById,
  OrderDocumentError,
} from "@/lib/order-documents";
import {
  buildInvoiceFilename,
  buildInvoiceNumber,
  resolveInvoiceDisplayDate,
} from "@/lib/invoice-number";
import {
  getInvoiceTemplatePath,
  getPuppeteerLaunchOptions,
} from "@/lib/invoice-runtime";
import type { BillingLineItem, PricingBreakdown } from "@/types/order";

type RawOrderItem = {
  name?: string;
  qty?: number;
  hsnCode?: string;
  sizeLabel?: string;
  unitPrice?: number;
  lineTotal?: number;
  customizationNote?: string;
};

type InvoiceItem = {
  name: string;
  qty: number;
  hsnCode?: string;
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
  gst_enabled?: number | null;
  gst_rate_percent?: number | null;
  gst_amount?: number | null;
  billing_breakdown_json?: string | null;
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

const INVOICE_TEMPLATE_PATH = getInvoiceTemplatePath();

const formatInr = (value: number) => {
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
  return `₹${amount}`;
};

const formatCalendarDate = (value?: string | null) => {
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

const parseBillingLines = (order: OrderRow) => {
  const normalizeLine = (line: BillingLineItem): BillingLineItem => {
    if (line.key === "shippingIgst") {
      return {
        ...line,
        key: "igst",
        label: line.ratePercent ? `IGST (${line.ratePercent}%)` : "IGST",
      };
    }
    if (/shipping\s+igst/i.test(line.label)) {
      return {
        ...line,
        label: line.label.replace(/shipping\s+/i, ""),
      };
    }
    if (/shipping\s*\/\s*delivery fee/i.test(line.label)) {
      return {
        ...line,
        label: "Delivery Fee",
      };
    }
    return line;
  };

  if (order.billing_breakdown_json) {
    try {
      const parsed = JSON.parse(order.billing_breakdown_json) as Partial<PricingBreakdown>;
      if (Array.isArray(parsed.billingLines) && parsed.billingLines.length > 0) {
        return parsed.billingLines
          .filter(
            (line): line is BillingLineItem =>
            typeof line === "object" &&
            line !== null &&
            typeof line.label === "string" &&
            typeof line.key === "string" &&
            Number.isFinite(Number(line.amount))
          )
          .map(normalizeLine);
      }
    } catch {
      // Fall back to legacy columns below.
    }
  }

  const total = safeNumber(order.total_amount, 0);
  const subtotal = safeNumber(order.subtotal_amount, total);
  const discount = safeNumber(order.discount_amount, 0);
  const gstAmount = safeNumber(order.gst_amount, 0);
  const gstRatePercent = safeNumber(order.gst_rate_percent, 0);
  const deliveryFee = safeNumber(
    order.delivery_fee_amount,
    Math.max(0, total - subtotal - gstAmount + discount)
  );
  const lines: BillingLineItem[] = [
    { key: "subtotal", label: "Subtotal", amount: subtotal, kind: "charge" },
  ];
  if (discount > 0) {
    lines.push({ key: "discount", label: "Discount", amount: discount, kind: "discount" });
  }
  if (gstAmount > 0) {
    lines.push({
      key: "cgst",
      label: gstRatePercent > 0 ? `GST (${gstRatePercent}%)` : "GST",
      amount: gstAmount,
      ratePercent: gstRatePercent,
      kind: "tax",
    });
  }
  if (deliveryFee > 0) {
    lines.push({
      key: "delivery",
      label: "Delivery Fee",
      amount: deliveryFee,
      kind: "charge",
    });
  }
  lines.push({ key: "total", label: "Total", amount: total, kind: "total" });
  return lines;
};

const renderBillingRows = (lines: BillingLineItem[]) => {
  const visibleLines = lines.filter((line) => line.key === "total" || Number(line.amount) !== 0);
  const hasMiddleRows = visibleLines.some(
    (line) => line.key !== "subtotal" && line.key !== "discount" && line.key !== "total"
  );

  return visibleLines
    .flatMap((line, index) => {
      const rows: string[] = [];
      if (
        line.key !== "total" &&
        hasMiddleRows &&
        (line.key === "cgst" || line.key === "igst" || line.key === "delivery")
      ) {
        const previous = visibleLines[index - 1];
        if (previous?.key === "subtotal" || previous?.key === "discount") {
          rows.push(`<tr class="divider"><td colspan="2"><hr /></td></tr>`);
        }
      }
      const amount = Number(line.amount);
      const amountPrefix = line.kind === "discount" && amount > 0 ? "- " : "";
      const className = line.key === "total" ? ` class="total-row"` : "";
      rows.push(
        `<tr${className}><td class="label">${escapeHtml(line.label)}</td><td class="amount">${amountPrefix}${escapeHtml(formatInr(amount))}</td></tr>`
      );
      return rows;
    })
    .join("");
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
        hsnCode: String(item.hsnCode ?? "").trim() || undefined,
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

    const invoiceNumber =
      order.invoice_number ||
      buildInvoiceNumber(
        order.id,
        order.source,
        order.order_kind,
        order.source === "offline" ? order.sale_date : order.paid_at || order.created_at
      );
    const invoiceFilename = buildInvoiceFilename(invoiceNumber);
    const invoiceDisplayDate = resolveInvoiceDisplayDate(
      order.id,
      order.source,
      order.order_kind,
      order.source === "offline" ? order.sale_date : order.paid_at || order.created_at,
      invoiceNumber
    );

    const items = normalizeItems(order);
    const billingRows = renderBillingRows(parseBillingLines(order));
    const buyerGst = parseBuyerGst(order.buyer_gst_json);

    const [template, bakeryLogoBytes, fssaiBytes, barcodeBytes] = await Promise.all([
      readFile(INVOICE_TEMPLATE_PATH, "utf8"),
      readBinaryIfExists(BRAND_LOGO_FILE_PATH),
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
        const hsn = item.hsnCode?.trim()
          ? `<span class="item-hsn">HSN: ${escapeHtml(item.hsnCode.trim())}</span>`
          : "";
        return `
          <tr class="item${index === items.length - 1 ? " last" : ""}">
            <td>
              <div class="item-title">${escapeHtml(item.name)}${hsn ? ` ${hsn}` : ""}</div>
              ${note}
            </td>
            <td class="qty-cell">${escapeHtml(String(item.qty))}</td>
            <td class="money-cell">${escapeHtml(formatInr(item.unitPrice))}</td>
            <td class="money-cell">${escapeHtml(formatInr(item.lineTotal))}</td>
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
      LOGO_SRC: bakeryLogoBytes ? toDataUri(bakeryLogoBytes, BRAND_LOGO_MIME_TYPE) : "",
      BRAND_NAME: escapeHtml(BRAND_NAME),
      BRAND_SUBTITLE: escapeHtml(TAGLINE),
      BADGES: badges,
      INVOICE_NUMBER: escapeHtml(invoiceNumber),
      ORDER_ID: escapeHtml(order.id),
      CREATED_DATE: escapeHtml(invoiceDisplayDate),
      ORDER_DATE: escapeHtml(formatCalendarDate(order.sale_date || order.created_at)),
      DUE_DATE: escapeHtml(formatCalendarDate(order.delivery_date)),
      SHIPPING_METHOD: escapeHtml(order.delivery_slot || "Delivery"),
      PAYMENT_METHOD: escapeHtml(order.payment_method || "-"),
      PAYMENT_STATUS: escapeHtml(order.payment_status || "-"),
      BARCODE_BLOCK: barcodeBlock,
      SENDER_NAME: escapeHtml(SELLER_LEGAL_NAME),
      SENDER_LINES: senderLines,
      RECEIVER_NAME: escapeHtml(order.customer_name || "Customer"),
      RECEIVER_LINES: receiverLines,
      ITEM_ROWS:
        itemRows ||
        `<tr class="item last"><td><div class="item-title">No item data recorded.</div></td><td class="qty-cell">-</td><td class="money-cell">-</td><td class="money-cell">-</td></tr>`,
      BILLING_ROWS: billingRows,
      NOTES: escapeHtml(noteSections.join("\n\n")),
      NOTES_BLOCK: notesBlock,
      FOOTER_TEXT: footerLines,
      FSSAI_BLOCK: fssaiBlock,
    });

    browser = await puppeteer.launch(await getPuppeteerLaunchOptions());
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    const pdfBinary = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const pdfBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(pdfBinary);
        controller.close();
      },
    });

    return new Response(pdfBody, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${invoiceFilename}\"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
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

    console.error("Failed to generate invoice PDF", error);
    return jsonError("Failed to generate invoice", 500, error);
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
