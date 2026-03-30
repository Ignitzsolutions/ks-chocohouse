import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
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

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
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
