import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";

const orders = [
  {
    id: "VR-8291",
    cake: "Velvet Noir",
    status: "Baker reviewing",
    date: "Feb 12, 2026",
  },
  {
    id: "VR-8184",
    cake: "Citrus Halo",
    status: "Delivered",
    date: "Jan 28, 2026",
  },
];

const addresses = [
  "908 Willow Ave, Apt 6B",
  "62 Garden Street, Floor 2",
];

export default function AccountPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="premium-panel space-y-3 rounded-3xl p-6">
          <Badge tone="sage">Customer profile</Badge>
          <h1 className="hero-display text-5xl leading-none">Welcome back, Mira.</h1>
          <p className="text-black/70">
            Your preferences, addresses, and order history are saved securely.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <section className="premium-panel rounded-3xl p-6">
            <h2 className="hero-display text-4xl leading-none">Order history</h2>
            <div className="mt-4 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="soft-card flex items-center justify-between rounded-2xl p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{order.cake}</p>
                    <p className="text-xs text-black/60">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-black/50">{order.id}</p>
                    <p className="text-sm font-semibold text-[color:var(--berry)]">
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="premium-panel rounded-3xl p-6">
            <h2 className="hero-display text-4xl leading-none">Saved preferences</h2>
            <div className="mt-4 space-y-3 text-sm text-black/70">
              <p>Dietary: Eggless, low sugar</p>
              <p>Preferred delivery window: 3:00 - 5:00 PM</p>
              <p>Favorite frosting: Silk ganache</p>
            </div>
            <div className="mt-6">
              <h3 className="text-lg">Saved addresses</h3>
              <div className="mt-3 space-y-2">
                {addresses.map((address) => (
                  <div
                    key={address}
                    className="soft-card rounded-2xl px-4 py-3 text-sm"
                  >
                    {address}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
