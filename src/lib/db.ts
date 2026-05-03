import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import productsJson from "../../data/products.json";
import {
  ADMIN_SETTINGS_ID,
  DEFAULT_DELIVERY_FEE_AMOUNT,
  DEFAULT_FREE_DELIVERY_THRESHOLD,
  DEFAULT_GST_RATE_PERCENT,
} from "@/lib/admin-settings";
import { DEFAULT_CATEGORY_CARDS } from "@/lib/default-categories";
import { getRuntimeConfig } from "@/lib/runtime-config";

const REQUIRED_HEALTH_TABLES = [
  "orders",
  "order_events",
  "products",
  "categories",
  "product_subcategories",
  "coupons",
  "blackout_dates",
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const FLAVOR_SEED_PATTERNS = [
  { label: "Dark Chocolate", test: /dark chocolate/i },
  { label: "Milk Chocolate", test: /milk chocolate/i },
  { label: "Chocolate", test: /\bchoco(?:late)?\b/i },
  { label: "Truffle", test: /truffle/i },
  { label: "Vanilla", test: /vanilla/i },
  { label: "Strawberry", test: /strawberry/i },
  { label: "Blueberry", test: /blueberry/i },
  { label: "Pineapple", test: /pineapple/i },
  { label: "Red Velvet", test: /red velvet/i },
  { label: "Mango", test: /mango/i },
  { label: "Lotus Biscoff", test: /biscoff|lotus/i },
  { label: "Butter", test: /butter/i },
  { label: "Almond", test: /almond/i },
  { label: "Walnut", test: /walnut/i },
  { label: "Cherry", test: /cherry/i },
  { label: "Fudge", test: /fudge/i },
  { label: "Cream", test: /cream/i },
];

function inferFlavorLabels(value: string) {
  return FLAVOR_SEED_PATTERNS.filter((entry) => entry.test.test(value)).map((entry) => entry.label);
}

function resolveDbPath() {
  return getRuntimeConfig().databasePath;
}

const dbPath = resolveDbPath();

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function validatePersistedDatabase() {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file does not exist at ${dbPath}`);
  }

  const readonlyDb = new Database(dbPath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const discoveredTables = new Set(
      (
        readonlyDb
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all() as Array<{ name: string }>
      ).map((row) => row.name)
    );

    for (const requiredTable of REQUIRED_HEALTH_TABLES) {
      if (!discoveredTables.has(requiredTable)) {
        throw new Error(`Database is missing required table ${requiredTable}`);
      }
    }

    readonlyDb.prepare("SELECT COUNT(1) AS count FROM categories").get();
    readonlyDb.prepare("SELECT COUNT(1) AS count FROM products").get();
    readonlyDb.prepare("SELECT COUNT(1) AS count FROM orders").get();
  } finally {
    readonlyDb.close();
  }
}

export function initDb() {
  const instance = getDb();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        cake_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        pincode TEXT,
        sale_date TEXT,
        delivery_date TEXT,
        delivery_slot TEXT,
        cake_message TEXT,
        order_items_json TEXT,
        category_summary TEXT,
        buyer_gst_json TEXT,
        source TEXT NOT NULL DEFAULT 'online',
        payment_method TEXT,
        payment_reference TEXT,
        payment_status TEXT NOT NULL DEFAULT 'Verification Pending',
        payment_verified_at TEXT,
        payment_verified_by TEXT,
        txn_id TEXT,
        invoice_number TEXT,
        invoice_ready INTEGER NOT NULL DEFAULT 0,
        paid_at TEXT,
        subtotal_amount INTEGER NOT NULL DEFAULT 0,
        delivery_fee_amount INTEGER NOT NULL DEFAULT 0,
        discount_amount INTEGER NOT NULL DEFAULT 0,
        gst_enabled INTEGER NOT NULL DEFAULT 1,
        gst_rate_percent INTEGER NOT NULL DEFAULT 18,
        gst_amount INTEGER NOT NULL DEFAULT 0,
        billing_breakdown_json TEXT,
        coupon_code TEXT,
        coupon_snapshot_json TEXT,
        total_amount INTEGER NOT NULL,
        order_kind TEXT NOT NULL DEFAULT 'sale',
        lifecycle_state TEXT NOT NULL DEFAULT 'finalized',
        parent_order_id TEXT,
        voided_at TEXT,
        voided_by TEXT,
        void_reason TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        status_updated_at TEXT,
        payment_updated_at TEXT
      )`
    )
    .run();

  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN sale_date TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN cake_message TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN order_items_json TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN category_summary TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN buyer_gst_json TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'online'").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN payment_method TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN payment_reference TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare(
        "ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Verification Pending'"
      )
      .run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN payment_verified_at TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN payment_verified_by TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN txn_id TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN invoice_number TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN paid_at TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE orders ADD COLUMN subtotal_amount INTEGER NOT NULL DEFAULT 0")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE orders ADD COLUMN delivery_fee_amount INTEGER NOT NULL DEFAULT 0")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE orders ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE orders ADD COLUMN gst_enabled INTEGER NOT NULL DEFAULT 1")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE orders ADD COLUMN gst_rate_percent INTEGER NOT NULL DEFAULT 18")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE orders ADD COLUMN gst_amount INTEGER NOT NULL DEFAULT 0")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN billing_breakdown_json TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN coupon_code TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN coupon_snapshot_json TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE orders ADD COLUMN invoice_ready INTEGER NOT NULL DEFAULT 0")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN updated_at TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN status_updated_at TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN payment_updated_at TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE orders ADD COLUMN order_kind TEXT NOT NULL DEFAULT 'sale'")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare(
        "ALTER TABLE orders ADD COLUMN lifecycle_state TEXT NOT NULL DEFAULT 'finalized'"
      )
      .run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN parent_order_id TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN voided_at TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN voided_by TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE orders ADD COLUMN void_reason TEXT").run();
  } catch {
    // column already exists
  }

  instance
    .prepare(
      `UPDATE orders
       SET source = COALESCE(NULLIF(source, ''), 'online'),
           payment_status = COALESCE(NULLIF(payment_status, ''),
             CASE
               WHEN invoice_number IS NOT NULL THEN 'Verified'
               WHEN status IN ('Awaiting Approval', 'Baking', 'Out for Delivery', 'Delivered') THEN 'Verified'
               ELSE 'Verification Pending'
             END
           ),
           invoice_ready = CASE
             WHEN invoice_number IS NOT NULL THEN 1
             ELSE COALESCE(invoice_ready, 0)
           END,
           subtotal_amount = CASE
             WHEN COALESCE(subtotal_amount, 0) > 0 THEN subtotal_amount
             ELSE CASE
               WHEN source = 'online' AND total_amount >= 120 THEN total_amount - 120
               ELSE total_amount
             END
           END,
           delivery_fee_amount = CASE
             WHEN COALESCE(delivery_fee_amount, 0) > 0 THEN delivery_fee_amount
             ELSE CASE
               WHEN source = 'online' AND total_amount >= 120 THEN 120
               ELSE 0
           END
           END,
           discount_amount = COALESCE(discount_amount, 0),
           gst_enabled = COALESCE(gst_enabled, 1),
           gst_rate_percent = CASE
             WHEN COALESCE(gst_rate_percent, 0) > 0 THEN gst_rate_percent
             ELSE 18
           END,
           gst_amount = COALESCE(gst_amount, 0),
           order_kind = COALESCE(NULLIF(order_kind, ''), 'sale'),
           lifecycle_state = COALESCE(NULLIF(lifecycle_state, ''), 'finalized'),
           sale_date = COALESCE(
             NULLIF(sale_date, ''),
             CASE
               WHEN source = 'offline' THEN substr(COALESCE(paid_at, created_at), 1, 10)
               ELSE sale_date
             END
           ),
           updated_at = COALESCE(updated_at, created_at),
           status_updated_at = COALESCE(status_updated_at, created_at),
           payment_updated_at = COALESCE(payment_updated_at, payment_verified_at, created_at)`
    )
    .run();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS order_events (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        from_value TEXT,
        to_value TEXT,
        actor TEXT,
        meta_json TEXT,
        created_at TEXT NOT NULL
      )`
    )
    .run();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS blackout_dates (
        date TEXT PRIMARY KEY,
        reason TEXT
      )`
    )
    .run();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        sub_category TEXT NOT NULL,
        sub_category_id TEXT,
        pricing_mode TEXT NOT NULL DEFAULT 'kg',
        price_inr INTEGER NOT NULL,
        base_price_per_kg_inr INTEGER,
        piece_label TEXT,
        image_src TEXT NOT NULL,
        image_gallery_json TEXT NOT NULL DEFAULT '[]',
        size_options_json TEXT NOT NULL DEFAULT '[]',
        hsn_code TEXT,
        flavor_selection_enabled INTEGER NOT NULL DEFAULT 0,
        eggless INTEGER NOT NULL DEFAULT 1,
        available INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS flavors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS product_flavors (
        product_id TEXT NOT NULL,
        flavor_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (product_id, flavor_id)
      )`
    )
    .run();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS admin_settings (
        id TEXT PRIMARY KEY,
        discount_enabled INTEGER NOT NULL DEFAULT 1,
        gst_enabled INTEGER NOT NULL DEFAULT 1,
        gst_rate_percent INTEGER NOT NULL DEFAULT 18,
        cgst_enabled INTEGER NOT NULL DEFAULT 1,
        cgst_rate_percent INTEGER NOT NULL DEFAULT 9,
        sgst_enabled INTEGER NOT NULL DEFAULT 1,
        sgst_rate_percent INTEGER NOT NULL DEFAULT 9,
        delivery_fee_enabled INTEGER NOT NULL DEFAULT 1,
        delivery_fee_amount INTEGER NOT NULL DEFAULT 120,
        free_delivery_threshold INTEGER NOT NULL DEFAULT 1500,
        shipping_igst_enabled INTEGER NOT NULL DEFAULT 0,
        shipping_igst_rate_percent INTEGER NOT NULL DEFAULT 18,
        shipping_igst_amount INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        image_src TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 999,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  for (const statement of [
    "ALTER TABLE admin_settings ADD COLUMN discount_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE admin_settings ADD COLUMN cgst_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE admin_settings ADD COLUMN cgst_rate_percent INTEGER NOT NULL DEFAULT 9",
    "ALTER TABLE admin_settings ADD COLUMN sgst_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE admin_settings ADD COLUMN sgst_rate_percent INTEGER NOT NULL DEFAULT 9",
    "ALTER TABLE admin_settings ADD COLUMN delivery_fee_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE admin_settings ADD COLUMN shipping_igst_enabled INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE admin_settings ADD COLUMN shipping_igst_rate_percent INTEGER NOT NULL DEFAULT 18",
    "ALTER TABLE admin_settings ADD COLUMN shipping_igst_amount INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      instance.prepare(statement).run();
    } catch {
      // column already exists
    }
  }

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS product_subcategories (
        id TEXT PRIMARY KEY,
        category_name TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 999,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(category_name, name)
      )`
    )
    .run();

  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        discount_type TEXT NOT NULL,
        discount_value INTEGER NOT NULL,
        min_order_amount INTEGER NOT NULL DEFAULT 0,
        max_discount_amount INTEGER,
        starts_at TEXT,
        expires_at TEXT,
        usage_limit INTEGER,
        used_count INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(delivery_date, delivery_slot)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)`
    )
    .run();
  instance
    .prepare(`CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source)`)
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_invoice_ready ON orders(invoice_ready)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders(total_amount)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_lifecycle ON orders(lifecycle_state, order_kind)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_parent_order ON orders(parent_order_id)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_order_events_order_created ON order_events(order_id, created_at)`
    )
    .run();

  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`
    )
    .run();
  instance
    .prepare(`CREATE INDEX IF NOT EXISTS idx_flavors_name ON flavors(name)`)
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_product_flavors_product ON product_flavors(product_id)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_product_flavors_flavor ON product_flavors(flavor_id)`
    )
    .run();
  try {
    instance
      .prepare("ALTER TABLE products ADD COLUMN size_options_json TEXT NOT NULL DEFAULT '[]'")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE products ADD COLUMN sub_category_id TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE products ADD COLUMN pricing_mode TEXT NOT NULL DEFAULT 'kg'")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE products ADD COLUMN base_price_per_kg_inr INTEGER").run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE products ADD COLUMN piece_label TEXT").run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE products ADD COLUMN image_gallery_json TEXT NOT NULL DEFAULT '[]'")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance
      .prepare("ALTER TABLE products ADD COLUMN flavor_selection_enabled INTEGER NOT NULL DEFAULT 0")
      .run();
  } catch {
    // column already exists
  }
  try {
    instance.prepare("ALTER TABLE products ADD COLUMN hsn_code TEXT").run();
  } catch {
    // column already exists
  }
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_product_subcategories_category_sort ON product_subcategories(category_name, sort_order, name)`
    )
    .run();

  const productsCount = instance
    .prepare("SELECT COUNT(*) AS count FROM products")
    .get() as { count: number };

  if (productsCount.count === 0) {
    const insertProduct = instance.prepare(
      `INSERT INTO products
        (id, name, description, category, sub_category, sub_category_id, pricing_mode, price_inr, base_price_per_kg_inr, piece_label, image_src, image_gallery_json, size_options_json, hsn_code, flavor_selection_enabled, eggless, available, created_at, updated_at)
        VALUES (@id, @name, @description, @category, @sub_category, @sub_category_id, @pricing_mode, @price_inr, @base_price_per_kg_inr, @piece_label, @image_src, @image_gallery_json, @size_options_json, @hsn_code, @flavor_selection_enabled, @eggless, @available, @created_at, @updated_at)`
    );

    const now = new Date().toISOString();
    const rows = productsJson as Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      subCategory: string;
      subCategoryId?: string;
      pricingMode?: string;
      priceInr: number;
      basePricePerKgInr?: number | null;
      pieceLabel?: string;
      imageSrc: string;
      imageGallery?: string[];
      sizeOptions?: string[];
      flavorSelectionEnabled?: boolean;
      hsnCode?: string;
      eggless: boolean;
      available: boolean;
    }>;

    const insertMany = instance.transaction(() => {
      rows.forEach((product) => {
        insertProduct.run({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          sub_category: product.subCategory,
          sub_category_id: product.subCategoryId ?? null,
          pricing_mode: String(product.pricingMode ?? "").trim().toLowerCase() === "pcs" ? "pcs" : "kg",
          price_inr: product.priceInr,
          base_price_per_kg_inr:
            String(product.pricingMode ?? "").trim().toLowerCase() === "pcs"
              ? null
              : Number(product.basePricePerKgInr ?? product.priceInr),
          piece_label: product.pieceLabel ?? null,
          image_src: product.imageSrc,
          image_gallery_json: JSON.stringify(
            Array.isArray(product.imageGallery)
              ? Array.from(new Set([product.imageSrc, ...product.imageGallery].filter(Boolean)))
              : [product.imageSrc]
          ),
          size_options_json: JSON.stringify(product.sizeOptions ?? []),
          hsn_code: String(product.hsnCode ?? "").trim() || null,
          flavor_selection_enabled: product.flavorSelectionEnabled ? 1 : 0,
          eggless: product.eggless ? 1 : 0,
          available: product.available ? 1 : 0,
          created_at: now,
          updated_at: now,
        });
      });
    });

    insertMany();
  }

  instance
    .prepare(
      `UPDATE products
       SET sub_category = 'Gift Collection',
           updated_at = @now
       WHERE id IN ('choc-dryfruit-assorted', 'choc-truffle-box')`
    )
    .run({ now: new Date().toISOString() });

  const categoriesCount = instance
    .prepare("SELECT COUNT(*) AS count FROM categories")
    .get() as { count: number };
  if (categoriesCount.count === 0) {
    const now = new Date().toISOString();
    const insertCategory = instance.prepare(
      `INSERT OR IGNORE INTO categories
        (id, name, image_src, sort_order, created_at, updated_at)
        VALUES (@id, @name, @image_src, @sort_order, @created_at, @updated_at)`
    );
    const insertCategories = instance.transaction(() => {
      DEFAULT_CATEGORY_CARDS.forEach((category) => {
        insertCategory.run({
          id: category.id,
          name: category.category,
          image_src: category.imageSrc,
          sort_order: category.sortOrder,
          created_at: now,
          updated_at: now,
        });
      });
    });
    insertCategories();
  }

  const syncCategoryCard = instance.prepare(
    `UPDATE categories
     SET image_src = @image_src,
         sort_order = @sort_order,
         updated_at = @updated_at
     WHERE name = @name`
  );
  const syncCategoryCards = instance.transaction(() => {
    const now = new Date().toISOString();
    DEFAULT_CATEGORY_CARDS.forEach((category) => {
      syncCategoryCard.run({
        name: category.category,
        image_src: category.imageSrc,
        sort_order: category.sortOrder,
        updated_at: now,
      });
    });
  });
  syncCategoryCards();

  const ensureSubcategory = instance.prepare(
    `INSERT OR IGNORE INTO product_subcategories
      (id, category_name, name, sort_order, active, created_at, updated_at)
      VALUES (@id, @category_name, @name, @sort_order, 1, @created_at, @updated_at)`
  );
  const selectSubcategory = instance.prepare(
    `SELECT id FROM product_subcategories WHERE category_name = ? AND name = ? LIMIT 1`
  );
  const productRows = instance
    .prepare(
      `SELECT id, category, sub_category, price_inr, pricing_mode, base_price_per_kg_inr, piece_label, image_src, image_gallery_json, flavor_selection_enabled
       FROM products`
    )
    .all() as Array<{
    id: string;
    category: string;
    sub_category: string;
    price_inr: number;
    pricing_mode: string | null;
    base_price_per_kg_inr: number | null;
    piece_label: string | null;
    image_src: string;
    image_gallery_json: string | null;
    flavor_selection_enabled: number | null;
  }>;

  const productSubcategoryCounts = new Map<string, number>();
  const now = new Date().toISOString();
  const updateProductMetadata = instance.prepare(
    `UPDATE products
     SET sub_category_id = @sub_category_id,
         pricing_mode = @pricing_mode,
         base_price_per_kg_inr = @base_price_per_kg_inr,
         piece_label = @piece_label,
         image_gallery_json = @image_gallery_json,
         flavor_selection_enabled = @flavor_selection_enabled,
         updated_at = @updated_at
     WHERE id = @id`
  );

  for (const row of productRows) {
    const categoryName = String(row.category ?? "").trim() || "General";
    const subCategoryName = String(row.sub_category ?? "").trim() || "General";
    const subcategoryKey = `${categoryName}::${subCategoryName}`;
    const sortOrder = (productSubcategoryCounts.get(categoryName) ?? 0) + 1;
    if (!productSubcategoryCounts.has(subcategoryKey)) {
      ensureSubcategory.run({
        id: `${slugify(categoryName)}-${slugify(subCategoryName) || "general"}`,
        category_name: categoryName,
        name: subCategoryName,
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
      });
      productSubcategoryCounts.set(categoryName, sortOrder);
      productSubcategoryCounts.set(subcategoryKey, sortOrder);
    }
    const subcategoryRow = selectSubcategory.get(categoryName, subCategoryName) as
      | { id: string }
      | undefined;
    const pricingMode =
      String(row.pricing_mode ?? "").trim().toLowerCase() === "pcs" ||
      /cupcake|chocolate|cookies?|brownie|dessert|jar|cup/i.test(categoryName)
        ? "pcs"
        : "kg";
    const pieceLabel =
      pricingMode === "pcs"
        ? row.piece_label ||
          (/cupcake/i.test(categoryName)
            ? "cupcakes"
            : /cookie/i.test(categoryName)
              ? "cookies"
              : /brownie/i.test(categoryName)
                ? "brownies"
                : "pieces")
        : null;
    let imageGalleryJson = row.image_gallery_json;
    try {
      const parsed = JSON.parse(row.image_gallery_json ?? "[]") as string[];
      const next = Array.from(new Set([row.image_src, ...parsed].filter(Boolean)));
      imageGalleryJson = JSON.stringify(next);
    } catch {
      imageGalleryJson = JSON.stringify([row.image_src].filter(Boolean));
    }

    updateProductMetadata.run({
      id: row.id,
      sub_category_id: subcategoryRow?.id ?? null,
      pricing_mode: pricingMode,
      base_price_per_kg_inr: pricingMode === "kg" ? Number(row.base_price_per_kg_inr ?? row.price_inr) : null,
      piece_label: pieceLabel,
      image_gallery_json: imageGalleryJson,
      flavor_selection_enabled: Number(row.flavor_selection_enabled ?? 0) === 1 ? 1 : 0,
      updated_at: now,
    });
  }

  const existingSettings = instance
    .prepare("SELECT id FROM admin_settings WHERE id = ? LIMIT 1")
    .get(ADMIN_SETTINGS_ID) as { id: string } | undefined;
  if (!existingSettings) {
    instance
      .prepare(
        `INSERT INTO admin_settings
          (id, gst_enabled, gst_rate_percent, delivery_fee_amount, free_delivery_threshold,
           shipping_igst_enabled, shipping_igst_amount, created_at, updated_at)
         VALUES (?, 1, ?, ?, ?, 0, 0, ?, ?)`
      )
      .run(
        ADMIN_SETTINGS_ID,
        DEFAULT_GST_RATE_PERCENT,
        DEFAULT_DELIVERY_FEE_AMOUNT,
        DEFAULT_FREE_DELIVERY_THRESHOLD,
        now,
        now
      );
  }

  const flavorCatalogCount = instance
    .prepare("SELECT COUNT(*) AS count FROM flavors")
    .get() as { count: number };
  const productFlavorCount = instance
    .prepare("SELECT COUNT(*) AS count FROM product_flavors")
    .get() as { count: number };
  if (flavorCatalogCount.count === 0 && productFlavorCount.count === 0) {
    const seedRows = instance
      .prepare("SELECT id, name, description FROM products")
      .all() as Array<{ id: string; name: string; description: string }>;
    const insertFlavor = instance.prepare(
      `INSERT OR IGNORE INTO flavors (id, name, active, created_at, updated_at)
       VALUES (@id, @name, 1, @created_at, @updated_at)`
    );
    const insertProductFlavor = instance.prepare(
      `INSERT OR IGNORE INTO product_flavors (product_id, flavor_id, created_at)
       VALUES (@product_id, @flavor_id, @created_at)`
    );
    const enableFlavorSelection = instance.prepare(
      `UPDATE products SET flavor_selection_enabled = 1, updated_at = @updated_at WHERE id = @id`
    );

    for (const row of seedRows) {
      const labels = Array.from(
        new Set(inferFlavorLabels(`${row.name} ${row.description}`))
      );
      if (labels.length === 0) continue;
      for (const label of labels) {
        const flavorId = slugify(label);
        insertFlavor.run({
          id: flavorId,
          name: label,
          created_at: now,
          updated_at: now,
        });
        insertProductFlavor.run({
          product_id: row.id,
          flavor_id: flavorId,
          created_at: now,
        });
      }
      enableFlavorSelection.run({ id: row.id, updated_at: now });
    }
  }
}
