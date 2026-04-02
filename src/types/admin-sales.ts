export type SalesOrderFilters = {
  page: number;
  pageSize: number;
  q: string;
  status: string;
  paymentStatus: string;
  source: string;
  deliveryDate: string;
  deliveryDateFrom: string;
  deliveryDateTo: string;
  slot: string;
  invoiceReady: "all" | "yes" | "no";
  amountMin: number | null;
  amountMax: number | null;
  sortBy: "created_at" | "delivery_date" | "total_amount" | "status" | "payment_status";
  sortDir: "asc" | "desc";
};

export type SalesOrderRow = {
  id: string;
  cake_name: string;
  quantity: number;
  customer_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  pincode: string | null;
  sale_date?: string | null;
  delivery_date: string | null;
  delivery_slot: string | null;
  cake_message: string | null;
  order_items_json: string | null;
  category_summary: string | null;
  buyer_gst_json?: string | null;
  source: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_status: string | null;
  payment_verified_at: string | null;
  payment_verified_by: string | null;
  txn_id: string | null;
  invoice_number: string | null;
  invoice_ready: number;
  paid_at: string | null;
  subtotal_amount?: number | null;
  delivery_fee_amount?: number | null;
  discount_amount?: number | null;
  coupon_code?: string | null;
  coupon_snapshot_json?: string | null;
  total_amount: number;
  order_kind?: "sale" | "return" | null;
  lifecycle_state?: "draft" | "finalized" | "void" | null;
  parent_order_id?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  void_reason?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  status_updated_at?: string | null;
  payment_updated_at?: string | null;
};

export type SalesOrderDetail = SalesOrderRow;

export type OrderEvent = {
  id: string;
  order_id: string;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  actor: string | null;
  meta_json: string | null;
  created_at: string;
};

export type SalesOrderListResponse = {
  rows: SalesOrderRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  appliedFilters: Record<string, string | number | boolean | null>;
};

export type SalesSummaryResponse = {
  cards: {
    todayOrders: number;
    todayRevenue: number;
    pendingPaymentCount: number;
    awaitingApprovalCount: number;
    todayDeliveriesCount: number;
  };
  totals: {
    filteredCount: number;
    filteredRevenue: number;
  };
};

export type ProductAnalyticsRow = {
  productId: string;
  name: string;
  category: string;
  orders: number;
  quantity: number;
  revenue: number;
};

export type CategoryAnalyticsRow = {
  category: string;
  orders: number;
  quantity: number;
  revenue: number;
};

export type ProductAnalyticsResponse = {
  rows: ProductAnalyticsRow[];
};

export type CategoryAnalyticsResponse = {
  rows: CategoryAnalyticsRow[];
};
