import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const steps = [
  { name: "Order confirmed", status: "done" },
  { name: "Baker reviewing", status: "active" },
  { name: "Custom details approved", status: "upcoming" },
  { name: "Out for delivery", status: "upcoming" },
];

export default function OrderConfirmPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Badge tone="gold">Order locked</Badge>
            <h1 className="hero-display text-5xl leading-none">Your cake is now in motion.</h1>
            <p className="text-black/70">
              Order #VR-8291 has been confirmed. Updates will reflect in your
              order timeline in real time.
            </p>

            <div className="premium-panel rounded-3xl p-6">
              <h3 className="hero-display text-4xl leading-none">Tracking timeline</h3>
              <div className="mt-6 space-y-4">
                {steps.map((step) => (
                  <div
                    key={step.name}
                    className="soft-card flex items-center gap-4 rounded-2xl p-4"
                  >
                    <div
                      className={`h-3 w-3 rounded-full ${
                        step.status === "done"
                          ? "bg-[color:var(--sage)]"
                          : step.status === "active"
                          ? "bg-[color:var(--berry)]"
                          : "bg-black/20"
                      }`}
                    />
                    <span className="text-sm font-semibold text-black/70">
                      {step.name}
                    </span>
                    {step.status === "active" && (
                      <span className="ml-auto rounded-full bg-[color:var(--berry)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--berry)]">
                        In progress
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="premium-panel rounded-3xl p-6">
              <h3 className="hero-display text-4xl leading-none">Delivery summary</h3>
              <div className="mt-4 space-y-2 text-sm text-black/70">
                <p>Thursday, Feb 12</p>
                <p>3:00 PM - 4:30 PM</p>
                <p>908 Willow Ave, Apt 6B</p>
                <p>Landmark: Lotus Cafe</p>
              </div>
              <div className="mt-6 space-y-3">
                <Button className="w-full">Message bakery</Button>
                <Button className="w-full" variant="outline">
                  Download receipt
                </Button>
              </div>
            </div>

            <div className="rounded-3xl bg-[color:var(--ink)]/95 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Smart updates
              </p>
              <p className="mt-4 text-sm text-white/80">
                Customization preview is now available in your order history.
                Review and request tweaks before 5:00 PM.
              </p>
              <Link
                href="/account"
                className="mt-6 inline-flex text-sm font-semibold text-white"
              >
                View order history →
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
