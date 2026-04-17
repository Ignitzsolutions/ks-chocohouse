# K S Choco House Web App

Next.js (App Router) storefront and ordering flow for **K S Choco House** with:
- category-based product discovery
- cart + checkout
- UPI QR checkout with payment reference verification
- admin order dashboard + offline invoice generation

## Business Details
- Brand: `K S Choco House`
- Tagline: `Ultimate Chocolate Destination`
- Description: `Indulge in sweetness with our homemade customised cakes and chocolates.`
- Location: `2/520, opp. to SRI RAJARAJESWARI RESIDENCY, Sastry Nagar, Bollavaram, Proddatur, Andhra Pradesh 516360, India`

## Run Locally

```bash
npm install
npm run dev -- --port 3006
```

Open `http://localhost:3006`.

## Environment Variables

Copy `.env.example` to `.env.local` and update it for local or production use.

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

## Product Data

- Source: `/Users/srujanreddy/Projects/bakery_ecom/data/products.json`
- Admin can also create/update products from `/admin/products`.

## Order Flow

1. Customer adds products on `/menu`.
2. Cart persists in localStorage on `/cart`.
3. On `/billing`, customer pays via QR and submits UTR/payment reference.
4. Order is created with status `Payment Verification Pending`.
5. Admin verifies payment from `/admin/orders`.
6. Invoice becomes downloadable after verification.

## Admin Pages

- Login: `/admin/login`
- Orders: `/admin/orders`
- Products/Categories: `/admin/products`
- Offline invoice generation: `/admin/invoices`

Admin credentials now come from env variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).

## Ubuntu 24.04 VPS Deployment

This repo is now prepared for a single-VPS deployment model:
- `Nginx` for reverse proxy
- `systemd` for process supervision
- local `SQLite` at `/var/lib/bakery_ecom/bakery.sqlite`
- local uploads at `/var/lib/bakery_ecom/uploads`
- release-based deploys under `/var/www/bakery_ecom/releases`

Deployment artifacts live in [`deploy/README.md`](/Users/srujanreddy/Projects/bakery_ecom/deploy/README.md), [`deploy/systemd/bakery_ecom.service`](/Users/srujanreddy/Projects/bakery_ecom/deploy/systemd/bakery_ecom.service), and [`deploy/nginx/bakery_ecom.conf`](/Users/srujanreddy/Projects/bakery_ecom/deploy/nginx/bakery_ecom.conf).

The GitHub Actions workflow now targets a Hostinger-style VPS over SSH and uses:
- build + lint in CI
- release artifact upload
- remote activation through `scripts/deploy-release.sh`
- `/api/health` and static asset verification
- rollback support through `scripts/rollback-release.sh`

Current production on the VPS is IP-only at `http://187.127.153.47`. Let’s Encrypt is intentionally deferred because a normal certificate cannot be issued for a bare server IP.

## Build Check

```bash
npm run lint
npm run build
```
