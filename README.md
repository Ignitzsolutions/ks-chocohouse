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

Copy `.env.example` to `.env.local` and update if needed:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3006
NEXT_PUBLIC_UPI_QR_IMAGE=/images/payments/ks-choco-house-upi-qr.png
NEXT_PUBLIC_UPI_LABEL=Pay via UPI QR
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
ADMIN_AUTH_SECRET=change-this-long-random-secret
ADMIN_SESSION_TTL_SECONDS=43200
```

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

## Build Check

```bash
npm run lint
npm run build
```
