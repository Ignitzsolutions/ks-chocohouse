# K S Choco House Commerce Platform

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-WAL-003b57?logo=sqlite&logoColor=white)
![Deployment](https://img.shields.io/badge/Deployment-Ubuntu%20VPS-7a4b2a)
![Status](https://img.shields.io/badge/Status-Production%20Ready-2f855a)

Production storefront, checkout, admin operations, and invoice system for **K S Choco House**, a 100% eggless bakery and chocolate brand.

Live site: [https://www.kschocohouse.com](https://www.kschocohouse.com)

## Product Capabilities

- Storefront menu with categories, subcategories, cart, and checkout.
- UPI/payment-reference based order submission and admin verification.
- Admin product, category, subcategory, flavor, coupon, blackout-date, and order management.
- Offline invoice creation for walk-in or manual sales.
- Configurable billing engine for discount, CGST, SGST, delivery fee, free-delivery threshold, and shipping IGST.
- PDF tax invoices with barcode, FSSAI details, buyer GST details, and stored billing snapshots.
- Sales dashboard with filtering, analytics, CSV export, and order detail views.
- Customer policy surfaces for no-return/no-refund and privacy expectations.

## Technology

- **Framework:** Next.js App Router
- **UI:** React, TypeScript, Tailwind CSS
- **Data:** SQLite with WAL mode through `better-sqlite3`
- **Invoices:** Puppeteer/Chrome HTML-to-PDF rendering
- **Uploads:** local persistent uploads directory served by Nginx
- **Runtime:** standalone Next.js behind Nginx and `systemd`
- **Deployment:** GitHub Actions to Ubuntu VPS over SSH

## Local Development

```bash
npm install
npm run dev -- --port 3001
```

Open [http://localhost:3001](http://localhost:3001).

Useful routes:

- `/menu` - storefront catalog
- `/cart` - cart review
- `/billing` - checkout and payment reference submission
- `/admin/login` - admin entry
- `/admin/orders` - operational order dashboard
- `/admin/invoices` - offline invoice generator
- `/admin/settings` - billing configuration
- `/policies` - customer policy page

## Environment

Copy `.env.example` to `.env.local` for local development.

Important production variables:

- `SITE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `DATABASE_PATH`
- `UPLOADS_DIR`
- `PUBLIC_UPLOADS_BASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_AUTH_SECRET`
- `CHROME_EXECUTABLE_PATH`

Production config is validated at runtime. Weak or missing admin secrets should fail production startup.

## Data and Reliability

Production business data is stored outside release folders:

- SQLite database: `/var/lib/bakery_ecom/bakery.sqlite`
- Uploads: `/var/lib/bakery_ecom/uploads`
- Backups: `/var/backups/bakery_ecom`
- Active release: `/var/www/bakery_ecom/current`

The deployment model treats app releases as disposable and `/var/lib/bakery_ecom` as the operational source of truth.

Reliability features include:

- SQLite WAL mode for restart-safe committed writes.
- Health endpoint at `/api/health`.
- Runtime validation before service startup.
- Release-based deployment with rollback support.
- Nightly database, uploads, and log backup scripts.
- Restore and verification runbooks.
- Recommended offsite backup flow for client-safe recovery.

See [deploy/RISK_PREVENTION_AND_RECOVERY.md](deploy/RISK_PREVENTION_AND_RECOVERY.md) for the client handoff and recovery guide.

## Deployment

Production runs on a single Ubuntu VPS:

- Nginx reverse proxy
- `systemd` process supervision
- standalone Next.js server
- persistent SQLite and uploads
- release directories under `/var/www/bakery_ecom/releases`

Deployment and operator assets live under [deploy/](deploy/):

- Nginx site config
- `systemd` service/timers
- production env example
- backup, restore, offsite sync, and rollback scripts

GitHub Actions builds the app, uploads a versioned release, activates it on the VPS, verifies health/static assets, and rolls back on failed activation.

## Quality Checks

```bash
npm run lint
npm run build
```

The production build uses:

```bash
SKIP_RUNTIME_VALIDATION=true next build --webpack
```

Runtime validation is handled separately on the server before service start.

## Repository Notes

- Do not commit secrets, production env files, database files, generated release archives, or customer uploads.
- Do not store sales data inside release directories.
- Keep invoice template changes compatible with `src/app/api/orders/[orderId]/invoice/route.ts` placeholders.
- Keep billing calculations centralized in `src/lib/pricing.ts` so checkout, admin invoices, and PDFs stay consistent.
