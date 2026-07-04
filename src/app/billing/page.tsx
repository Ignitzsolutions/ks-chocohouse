"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_ADMIN_SETTINGS,
  type AdminSettings,
} from "@/lib/admin-settings";
import { addItem, clearCart, getCart, type CartItem } from "@/lib/cart";
import { computePricing } from "@/lib/pricing";
import { formatInr, getPriceDisplayMeta, getProductOptionLabel } from "@/lib/products";
import { useCartProductLookup } from "@/lib/use-cart-product-lookup";

type DetailedItem = {
  productId: string;
  qty: number;
  sizeLabel?: string;
  optionLabel?: string;
  customizationNote?: string;
  id: string;
  name: string;
  category: string;
  hsnCode?: string;
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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const cartIds = useMemo(() => cartItems.map((item) => item.productId), [cartItems]);
  const { productById } = useCartProductLookup(cartIds);
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
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [messageTouched, setMessageTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const successTimer = useRef<number | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);

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

    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSettings((data.settings ?? DEFAULT_ADMIN_SETTINGS) as AdminSettings))
      .catch(() => setSettings(DEFAULT_ADMIN_SETTINGS));
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
      if (!product || !product.available) continue;
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
        hsnCode: product.hsnCode,
        priceInr: unitPrice,
        lineTotal: entry.qty * unitPrice,
      });
    }
    return rows;
  }, [cartItems, productById]);

  const blockedCartItems = useMemo(() => {
    return cartItems
      .map((entry) => {
        const product = productById.get(entry.productId);
        if (!product) return { entry, status: "missing" as const };
        if (!product.available) return { entry, status: "unavailable" as const, product };
        return null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [cartItems, productById]);
  const hasBlockedItems = blockedCartItems.length > 0;

  const subtotal = detailed.reduce((sum, item) => sum + item.lineTotal, 0);
  const pricing = useMemo(
    () => computePricing(subtotal, appliedCoupon?.discountAmount ?? 0, settings),
    [appliedCoupon?.discountAmount, settings, subtotal]
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
  const todayIsoDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);
  const maxDeliveryDate = useMemo(() => {
    const base = new Date(`${todayIsoDate}T00:00:00`);
    base.setDate(base.getDate() + 90);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, "0");
    const day = String(base.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [todayIsoDate]);

  const canSubmit =
    !loading &&
    detailed.length > 0 &&
    !hasBlockedItems &&
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

  const baseInputClass =
    "mt-2 w-full rounded-2xl border bg-[color:var(--cream)] px-4 py-3 text-sm transition focus:outline-none focus:ring-2";
  const invalidRing =
    "!border-red-500 !bg-red-50 !shadow-[0_0_0_3px_rgba(239,68,68,0.25)] focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.35)]";
  const validRing = "border-black/10 focus:border-black/30 focus:ring-black/10";
  const inputClass = (isInvalid: boolean) =>
    `${baseInputClass} ${submitAttempted && isInvalid ? invalidRing : validRing}`;
  const RequiredMark = () => (
    <span className="ml-0.5 text-red-600" aria-hidden="true">
      *
    </span>
  );

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
    if (!canSubmit) {
      setSubmitAttempted(true);
      setError(null);
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
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
          hsnCode: item.hsnCode ?? "",
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
        const unavailable: string[] = Array.isArray(data?.unavailableProductIds)
          ? data.unavailableProductIds
          : [];
        const missing: string[] = Array.isArray(data?.missingProductIds)
          ? data.missingProductIds
          : [];
        if (unavailable.length > 0 || missing.length > 0) {
          throw new Error(
            "Some items in your cart are no longer available. Please return to your cart and remove them."
          );
        }
        throw new Error(data?.error ?? "Failed to submit order");
      }

      if (data?.duplicate) {
        // Server detected this payment reference was already submitted;
        // treat as success and surface the existing order id.
        setError(null);
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

        {hasBlockedItems && (
          <div
            role="alert"
            className="mt-6 rounded-3xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800"
          >
            <p className="font-semibold">
              {blockedCartItems.length === 1
                ? "1 item in your cart is no longer available"
                : `${blockedCartItems.length} items in your cart are no longer available`}
            </p>
            <p className="mt-1 text-red-700">
              Please return to your cart to remove them before you can place this order.
            </p>
            <Link
              href="/cart"
              className="mt-3 inline-flex rounded-full border border-red-400 bg-white px-4 py-2 text-xs font-semibold text-red-700"
            >
              Back to cart
            </Link>
          </div>
        )}

        {detailed.length === 0 && !hasBlockedItems && (
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

              <div ref={formTopRef} className="mt-6 grid gap-4">
                <label className="text-sm font-semibold text-black/70">
                  Full Name
                  <RequiredMark />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass(!name.trim())}
                    placeholder="Your name"
                    aria-required="true"
                    aria-invalid={submitAttempted && !name.trim()}
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Mobile Number
                  <RequiredMark />
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={inputClass(!phone.trim())}
                    placeholder="10-digit mobile"
                    aria-required="true"
                    aria-invalid={submitAttempted && !phone.trim()}
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass(false)}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Delivery Address
                  <RequiredMark />
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    rows={3}
                    className={inputClass(!address.trim())}
                    placeholder="Street, city, landmark"
                    aria-required="true"
                    aria-invalid={submitAttempted && !address.trim()}
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Pincode
                  <RequiredMark />
                  <input
                    value={pincode}
                    onChange={(event) => setPincode(event.target.value)}
                    className={inputClass(!pincode.trim())}
                    placeholder="e.g. 516360"
                    aria-required="true"
                    aria-invalid={submitAttempted && !pincode.trim()}
                  />
                </label>
                <label className="text-sm font-semibold text-black/70">
                  Delivery Date
                  <RequiredMark />
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(event) => setDeliveryDate(event.target.value)}
                    min={todayIsoDate}
                    max={maxDeliveryDate}
                    className={inputClass(!deliveryDate.trim())}
                    aria-required="true"
                    aria-invalid={submitAttempted && !deliveryDate.trim()}
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
                  <RequiredMark />
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    className={`${inputClass(normalizedPaymentRef.length < 6)} uppercase`}
                    placeholder="Enter UTR / reference from payment app"
                    maxLength={40}
                    aria-required="true"
                    aria-invalid={submitAttempted && normalizedPaymentRef.length < 6}
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
                {pricing.billingLines.map((line) => (
                  <div
                    key={line.key}
                    className={`flex items-center justify-between ${
                      line.key === "total"
                        ? "border-t border-black/10 pt-2 text-base font-semibold"
                        : line.kind === "discount"
                          ? "text-emerald-700"
                          : ""
                    }`}
                  >
                    <span>{line.label}</span>
                    <span>
                      {line.kind === "discount" ? "- " : ""}
                      {formatInr(line.amount)}
                    </span>
                  </div>
                ))}
                {pricing.freeDeliveryApplied ? (
                  <p className="text-xs text-emerald-700">
                    Delivery charge waived for orders above {formatInr(settings.freeDeliveryThreshold)}.
                  </p>
                ) : null}
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
                <Button
                  className="w-full"
                  onClick={handleSubmitPayment}
                  disabled={loading || detailed.length === 0 || Boolean(blockedInfo)}
                >
                  {loading ? "Submitting..." : "Submit Payment Reference"}
                </Button>
                {submitAttempted && missingFields.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <p className="font-semibold">Please fill the required fields:</p>
                    <p className="mt-1">{missingFields.join(", ")}</p>
                  </div>
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
