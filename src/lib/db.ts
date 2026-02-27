import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import productsJson from "../../data/products.json";
import { DEFAULT_CATEGORY_CARDS } from "@/lib/default-categories";

function resolveDbPath() {
  const configuredPath = process.env.DATABASE_PATH?.trim();
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  // Azure App Service should store the SQLite file in persistent /home storage.
  if (process.env.WEBSITE_SITE_NAME || process.env.WEBSITE_INSTANCE_ID) {
    return "/home/data/bakery.sqlite";
  }

  // Vercel filesystem is read-only except /tmp.
  if (process.env.VERCEL) {
    return "/tmp/bakery.sqlite";
  }

  return path.join(process.cwd(), "data", "bakery.sqlite");
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
        delivery_date TEXT,
        delivery_slot TEXT,
        cake_message TEXT,
        order_items_json TEXT,
        category_summary TEXT,
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
        total_amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        status_updated_at TEXT,
        payment_updated_at TEXT
      )`
    )
    .run();

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
        price_inr INTEGER NOT NULL,
        image_src TEXT NOT NULL,
        eggless INTEGER NOT NULL DEFAULT 1,
        available INTEGER NOT NULL DEFAULT 1,
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
      `CREATE INDEX IF NOT EXISTS idx_order_events_order_created ON order_events(order_id, created_at)`
    )
    .run();

  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`
    )
    .run();
  instance
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name)`
    )
    .run();

  const productsCount = instance
    .prepare("SELECT COUNT(*) AS count FROM products")
    .get() as { count: number };

  if (productsCount.count === 0) {
    const insertProduct = instance.prepare(
      `INSERT INTO products
        (id, name, description, category, sub_category, price_inr, image_src, eggless, available, created_at, updated_at)
        VALUES (@id, @name, @description, @category, @sub_category, @price_inr, @image_src, @eggless, @available, @created_at, @updated_at)`
    );

    const now = new Date().toISOString();
    const rows = productsJson as Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      subCategory: string;
      priceInr: number;
      imageSrc: string;
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
          price_inr: product.priceInr,
          image_src: product.imageSrc,
          eggless: product.eggless ? 1 : 0,
          available: product.available ? 1 : 0,
          created_at: now,
          updated_at: now,
        });
      });
    });

    insertMany();
  }

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
}
