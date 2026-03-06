import { getDb, initDb } from "@/lib/db";

export type OrderDocumentRow = {
  id: string;
  invoice_number?: string | null;
  invoice_ready?: number | null;
  [key: string]: unknown;
};

export class OrderDocumentError extends Error {
  readonly status: number;
  readonly details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = "OrderDocumentError";
    this.status = status;
    this.details = details;
  }
}

export function getOrderById(orderId: string) {
  initDb();
  return getDb()
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(orderId) as OrderDocumentRow | undefined;
}

export function assertInvoiceAvailable(
  order: OrderDocumentRow | null | undefined
): asserts order is OrderDocumentRow {
  if (!order) {
    throw new OrderDocumentError(404, "Order not found");
  }

  if (!order.invoice_number || Number(order.invoice_ready ?? 0) !== 1) {
    throw new OrderDocumentError(
      409,
      "Invoice is not available yet",
      "Invoice will be generated after payment verification and order acceptance."
    );
  }
}
