const REVIEWS = [
  {
    name: "Jaya Sathwik Bathuri",
    text:
      "I recently visited KS Chocohouse and it was such a delightful experience. The place feels warm and inviting. The homemade chocolates are rich, creamy, and bursting with flavor with unique options.",
  },
  {
    name: "Vigu Anwal",
    text:
      "Best chocolate ever. You can taste the quality in every bite and the shop has real chocolate vibes. The chocolates melt perfectly in the mouth. You will come back again.",
  },
  {
    name: "Harrish Harry",
    text:
      "Visited twice. The best chocolate was Kunafa chocolate. They customize different cakes, chocolates, and pastries with reasonable prices and delicious taste.",
  },
  {
    name: "Harini",
    text:
      "Bought a cake and absolutely loved it. Ordered chocolate flavour with 300 grams. It looks simple but is rich in every bite. Superb taste.",
  },
  {
    name: "Juturu Harsha",
    text:
      "Best quality and home made. They customize and bake cakes, including almost sugar-less cakes. Great value for the price.",
  },
  {
    name: "Joy Amal",
    text:
      "Very homely shop and the best chocolate was the Kunafa chocolate bar. Cheesecakes are also available and the flavors are great.",
  },
  {
    name: "Patya Reddy",
    text:
      "Chocolates are exceptional. The focaccia bread is top-notch and the cakes are impressive. My favorite is the honey cake.",
  },
  {
    name: "Prasu Loosy Prasanna",
    text:
      "Amazing place with handmade Belgian chocolate. You can actually taste the cocoa. Prices are reasonable for the A+ quality. Must visit.",
  },
  {
    name: "Korupolu Hari Vamsi",
    text:
      "Best homemade chocolates. The way they receive customers is great. Tried 4–5 chocolates and the kunafa and biryani flavors are totally worth it.",
  },
  {
    name: "Anjana Charan",
    text:
      "Amazing homemade bakes and chocolates. Pure, hygienic, and tasty. They customize flavors as per your request. Dine-in or takeaway.",
  },
];

export function ReviewsMarquee() {
  const looped = [...REVIEWS, ...REVIEWS];

  return (
    <section className="premium-panel rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            Google Reviews
          </p>
          <h2 className="hero-display mt-2 text-4xl">What Customers Say</h2>
        </div>
        <a
          href="https://maps.app.goo.gl/8u854U6K9BDk7CsT7"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--berry)]"
        >
          View Google Reviews
        </a>
      </div>

      <div className="marquee-wrap mt-6">
        <div className="marquee-track">
          {looped.map((review, index) => (
            <div
              key={`${review.name}-${index}`}
              className="marquee-item min-w-[260px] max-w-[260px] flex-col items-start rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-[color:var(--ink)]">{review.name}</p>
              <div className="mt-1 text-xs text-[color:var(--berry)]">★★★★★</div>
              <p className="mt-2 text-xs leading-5 text-black/65">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
