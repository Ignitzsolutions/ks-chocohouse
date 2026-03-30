import { PHONE_NUMBER_TEL, PHONE_NUMBER_DISPLAY, BRAND_NAME, whatsappLink } from "@/lib/brand";

export function MobileCtaBar() {
  const wa = whatsappLink(`Hi ${BRAND_NAME}, I want to place an order.`);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--line)] bg-white md:hidden">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <a
          href={`tel:${PHONE_NUMBER_TEL}`}
          className="flex-1 border border-[color:var(--line)] bg-[color:var(--cream)] px-4 py-3 text-center text-sm font-semibold text-[color:var(--ink)]"
        >
          Call {PHONE_NUMBER_DISPLAY}
        </a>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="flex-1 border border-[color:var(--berry-dark)] bg-[color:var(--berry)] px-4 py-3 text-center text-sm font-semibold text-white"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
