"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addItem, clearCart, getCart, type CartItem } from "@/lib/cart";
import { computePricing } from "@/lib/pricing";
import { formatInr, getPriceDisplayMeta, getProductOptionLabel } from "@/lib/products";
import { useProducts } from "@/lib/use-products";

type DetailedItem = {
  productId: string;
  qty: number;
  sizeLabel?: string;
  optionLabel?: string;
  customizationNote?: string;
  id: string;
  name: string;
  category: string;
  priceInr: number;
  lineTotal: number;
};

const UPI_QR_IMAGE =
  process.env.NEXT_PUBLIC_UPI_QR_IMAGE ?? "/images/payments/ks-choco-house-upi-qr.png";
const PAYMENT_METHODS = ["UPI QR", "UPI Transfer", "Bank Transfer"] as const;

type AppliedCouponState = {
  code: string;
  label: string;
  discountAmount: number;
} | null;

export default function BillingPage() {
  const { productById } = useProducts();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [message, setMessage] = useState("");
  const [gstBusinessName, setGstBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [gstBillingAddress, setGstBillingAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("3:00 PM - 4:30 PM");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("UPI QR");
  const [paymentReference, setPaymentReference] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponState>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [blackouts, setBlackouts] = useState<{ date: string; reason: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [messageTouched, setMessageTouched] = useState(false);
  const successTimer = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const product = params.get("product");
    const current = getCart();

    if (current.length === 0 && product) {
      addItem(product, 1);
      setCartItems(getCart());
    } else {
      setCartItems(current);
    }

    fetch("/api/blackouts")
      .then((res) => res.json())
      .then((data) => setBlackouts(data.blackouts ?? []))
      .catch(() => setBlackouts([]));
  }, []);

  useEffect(() => {
    return () => {
      if (successTimer.current) {
        window.clearTimeout(successTimer.current);
      }
    };
  }, []);

  const detailed = useMemo<DetailedItem[]>(() => {
    const rows: DetailedItem[] = [];
    for (const entry of cartItems) {
      const product = productById.get(entry.productId);
      if (!product) continue;
      const unitPrice = getPriceDisplayMeta(product, entry.sizeLabel).finalPrice;
      rows.push({
        productId: entry.productId,
        qty: entry.qty,
        sizeLabel: entry.sizeLabel,
        optionLabel: getProductOptionLabel(product),
        customizationNote: entry.customizationNote,
        id: product.id,
        name: product.name,
        category: product.category,
        priceInr: unitPrice,
        lineTotal: entry.qty * unitPrice,
      });
    }
    return rows;
  }, [cartItems, productById]);

  const subtotal = detailed.reduce((sum, item) => sum + item.lineTotal, 0);
  const pricing = useMemo(
    () => computePricing(subtotal, appliedCoupon?.discountAmount ?? 0),
    [appliedCoupon?.discountAmount, subtotal]
  );
  const totalQty = detailed.reduce((sum, item) => sum + item.qty, 0);
  const categorySummary = Array.from(new Set(detailed.map((i) => i.category))).join(", ");
  const cartMessageDefault = useMemo(
    () =>
      detailed
      .filter((item) => item.customizationNote)
      .map((item) => `${item.name}:\n${item.customizationNote}`)
      .join("\n\n")
      .trimEnd(),
    [detailed]
  );
  const composedMessage = useMemo(() => message.trimEnd(), [message]);

  useEffect(() => {
    if (!messageTouched) {
      setMessage(cartMessageDefault);
    }
  }, [cartMessageDefault, messageTouched]);

  const blockedInfo = useMemo(() => {
    if (!deliveryDate) return null;
    return blackouts.find((item) => item.date === deliveryDate) ?? null;
  }, [blackouts, deliveryDate]);

  const normalizedPaymentRef = paymentReference.trim().toUpperCase();

  const canSubmit =
    !loading &&
    detailed.length > 0 &&
    !blockedInfo &&
    Boolean(name.trim()) &&
    Boolean(phone.trim()) &&
    Boolean(address.trim()) &&
    Boolean(pincode.trim()) &&
    Boolean(deliveryDate.trim()) &&
    normalizedPaymentRef.length >= 6;

  const missingFields = [
    !name.trim() ? "Name" : null,
    !phone.trim() ? "Mobile" : null,
    !address.trim() ? "Address" : null,
    !pincode.trim() ? "Pincode" : null,
    !deliveryDate.trim() ? "Delivery date" : null,
    normalizedPaymentRef.length < 6 ? "UTR / Reference" : null,
  ].filter(Boolean) as string[];

  const handleApplyCoupon = async () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) {
      setAppliedCoupon(null);
      return;
    }

    setCouponBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalizedCode,
          subtotal,
          deliveryFee: computePricing(subtotal).deliveryFeeAmount,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.valid) {
        throw new Error(data?.error ?? "Invalid coupon");
      }
      setCouponCode(String(data.normalizedCode ?? normalizedCode));
      setAppliedCoupon({
        code: String(data.normalizedCode ?? normalizedCode),
        label: String(data.label ?? normalizedCode),
        discountAmount: Number(data.discountAmount ?? 0),
      });
    } catch (err) {
      setAppliedCoupon(null);
      setError(String(err));
    } finally {
      setCouponBusy(false);
    }
  };

  const handleSubmitPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      if (blockedInfo) {
        throw new Error("Selected delivery date is blocked");
      }

      const orderDetails = {
        items: detailed.map((item) => ({
          id: item.id,
          name: item.sizeLabel ? `${item.name} (${item.sizeLabel})` : item.name,
          category: item.category,
          qty: item.qty,
          sizeLabel: item.sizeLabel ?? "",
          customizationNote: item.customizationNote ?? "",
          unitPrice: item.priceInr,
          lineTotal: item.lineTotal,
        })),
        categorySummary,
        total: pricing.totalAmount,
        cake_name: detailed.length === 1 ? detailed[0].name : "Mixed Order",
        quantity: totalQty,
        customer_name: name,
        phone,
        email,
        address,
        pincode,
        delivery_date: deliveryDate,
        delivery_slot: deliverySlot,
        cake_message: composedMessage,
      };

      const response = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: pricing.totalAmount,
          paymentMethod,
          paymentReference: normalizedPaymentRef,
          couponCode: appliedCoupon?.code ?? "",
          buyerGst: {
            businessName: gstBusinessName,
            gstin,
            billingAddress: gstBillingAddress,
          },
          orderDetails,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to submit order");
      }

      clearCart();
      setCartItems([]);

      const orderId = String(data?.orderId ?? "");
      setSuccessOrderId(orderId);
      if (successTimer.current) {
        window.clearTimeout(successTimer.current);
      }
      successTimer.current = window.setTimeout(() => {
        setSuccessOrderId(null);
      }, 10000);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="premium-panel sticky top-20 z-20 rounded-2xl px-5 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40">Ordering</p>
          <p className="text-lg font-semibold">
            {detailed.length === 0
              ? "No items in cart"
              : detailed.length === 1
              ? detailed[0].name
              : `${detailed.length} items`}
          </p>
        </div>

        {detailed.length === 0 && (
          <div className="premium-panel mt-8 rounded-2xl p-6">
            <p className="text-sm text-black/60">Your cart is empty.</p>
            <Link
              href="/menu"
              className="mt-4 inline-flex rounded-full bg-gradient-to-b from-[color:var(--berry)] to-[color:var(--berry-dark)] px-4 py-2 text-sm font-semibold text-white"
            >
              Go to menu
            </Link>
          </div>
        )}

        {detailed.length > 0 && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="premium-panel rounded-3xl p-6">
              <div className="space-y-2">
                <Badge tone="sage">Billing Details</Badge>
                <h1 className="hero-display text-5xl leading-none">Confirm your order</h1>
                <p className="text-sm text-black/60">
                  Pay via UPI and submit the UTR/reference number for verification.
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="text-sm font-semibold text-black/70">
                  Full Name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                    placeholder="Your name"
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Mobile Number
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                    placeholder="10-digit mobile"
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Delivery Address
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                    placeholder="Street, city, landmark"
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Pincode
                  <input
                    value={pincode}
                    onChange={(event) => setPincode(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                    placeholder="e.g. 516360"
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Delivery Date
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(event) => setDeliveryDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Delivery Slot
                  <select
                    value={deliverySlot}
                    onChange={(event) => setDeliverySlot(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                  >
                    <option>10:00 AM - 11:30 AM</option>
                    <option>12:00 PM - 1:30 PM</option>
                    <option>3:00 PM - 4:30 PM</option>
                    <option>5:00 PM - 6:30 PM</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Message Note
                  <textarea
                    value={message}
                    onChange={(event) => {
                      setMessageTouched(true);
                      setMessage(event.target.value);
                    }}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm leading-relaxed"
                    placeholder="Example: Name on cake, color theme, topper style, less sweet..."
                    spellCheck={false}
                  />
                </label>

                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-sm font-semibold text-black/75">Buyer GST Details (Optional)</p>
                  <div className="mt-3 grid gap-3">
                    <input
                      value={gstBusinessName}
                      onChange={(event) => setGstBusinessName(event.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                      placeholder="Business name"
                    />
                    <input
                      value={gstin}
                      onChange={(event) => setGstin(event.target.value.toUpperCase())}
                      className="w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm uppercase"
                      placeholder="GSTIN"
                    />
                    <textarea
                      value={gstBillingAddress}
                      onChange={(event) => setGstBillingAddress(event.target.value)}
                      rows={2}
                      className="w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                      placeholder="Billing address for invoice"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-sm font-semibold text-black/75">Scan & Pay</p>
                  <p className="mt-1 text-xs text-black/55">
                    Use this UPI QR to complete payment.
                  </p>
                  <div className="mt-3 flex justify-center">
                    <div className="rounded-2xl border border-black/10 bg-white p-2">
                      <Image
                        src={UPI_QR_IMAGE}
                        alt="UPI QR code for payment"
                        width={240}
                        height={354}
                        className="h-auto w-[240px] rounded-xl object-contain"
                        priority
                      />
                    </div>
                  </div>
                </div>

                <label className="text-sm font-semibold text-black/70">
                  Payment Method
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(event.target.value as (typeof PAYMENT_METHODS)[number])
                    }
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-black/70">
                  UTR / Payment Reference Number
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm uppercase"
                    placeholder="Enter UTR / reference from payment app"
                    maxLength={40}
                  />
                </label>

                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-sm font-semibold text-black/75">Coupon Code</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value.toUpperCase());
                        setAppliedCoupon(null);
                      }}
                      className="w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm uppercase"
                      placeholder="Enter coupon code"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponBusy || subtotal <= 0}
                      className="rounded-2xl bg-[color:var(--berry)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {couponBusy ? "Applying..." : "Apply"}
                    </button>
                  </div>
                  {appliedCoupon ? (
                    <p className="mt-2 text-xs text-emerald-700">
                      {appliedCoupon.label} applied. You save {formatInr(appliedCoupon.discountAmount)}.
                    </p>
                  ) : null}
                </div>

                {blockedInfo && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Orders are blocked on {blockedInfo.date}
                    {blockedInfo.reason ? ` - ${blockedInfo.reason}` : ""}
                  </div>
                )}
              </div>
            </div>

            <aside className="premium-panel space-y-6 rounded-3xl p-6">
              <div>
                <Badge tone="gold">Order Summary</Badge>
                <h2 className="hero-display mt-3 text-4xl leading-none">{categorySummary}</h2>
                <p className="text-sm text-black/60">{totalQty} item(s)</p>
              </div>

              <div className="space-y-3">
                {detailed.map((item) => (
                  <div key={`${item.productId}-${item.sizeLabel ?? ""}`} className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span>
                        {item.name} x {item.qty}
                      </span>
                      <span>{formatInr(item.lineTotal)}</span>
                    </div>
                    {item.sizeLabel ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--berry)]">
                        {item.optionLabel}: {item.sizeLabel}
                      </p>
                    ) : null}
                    {item.customizationNote ? (
                      <p className="whitespace-pre-wrap text-xs text-black/55">
                        Message Note:{"\n"}
                        {item.customizationNote}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatInr(pricing.subtotalAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery</span>
                  <span>{formatInr(pricing.deliveryFeeAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <span>{formatInr(pricing.discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>{formatInr(0)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatInr(pricing.totalAmount)}</span>
                </div>
              </div>

              {composedMessage ? (
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs text-black/60">
                  <p className="font-semibold uppercase tracking-[0.12em] text-black/50">
                    Message Note
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{composedMessage}</p>
                </div>
              ) : null}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Button className="w-full" onClick={handleSubmitPayment} disabled={!canSubmit}>
                  {loading ? "Submitting..." : "Submit Payment Reference"}
                </Button>
                {!canSubmit && (
                  <p className="text-xs text-black/55">
                    Complete required fields: {missingFields.join(", ")}
                  </p>
                )}
              </div>
            </aside>
          </section>
        )}
      </main>
      <SiteFooter />

      {successOrderId && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="success-modal-card premium-panel w-full max-w-md rounded-3xl p-7 text-center">
            <div className="success-check mx-auto">
              <svg viewBox="0 0 52 52" className="h-14 w-14" aria-hidden="true">
                <path
                  className="success-checkmark"
                  fill="none"
                  stroke="white"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 27l8 8 16-16"
                />
              </svg>
            </div>
            <h3 className="hero-display mt-4 text-5xl leading-none">Payment Submitted</h3>
            <p className="mt-2 text-sm text-black/65">
              Baker needs to accept your order.
              {successOrderId ? ` Order ID: ${successOrderId}.` : ""}
            </p>
            <p className="mt-1 text-xs text-black/55">
              Invoice will be available after payment verification and approval.
            </p>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--berry)]">
                Baking started
              </p>
              <div className="baking-bars mx-auto mt-3 flex w-24 items-end justify-center gap-1.5">
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="mt-3 text-xs text-black/50">This message closes in 10 seconds.</p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSuccessOrderId(null)}
                className="rounded-full bg-gradient-to-b from-[color:var(--berry)] to-[color:var(--berry-dark)] px-5 py-2 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
