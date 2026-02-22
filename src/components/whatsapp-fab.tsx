import { whatsappLink, BRAND_NAME } from "@/lib/brand";

export function WhatsappFab() {
  const href = whatsappLink(`Hi ${BRAND_NAME}, I want to place an order / enquiry.`);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-24 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--berry)] text-white shadow-lg transition hover:opacity-95 md:bottom-6"
      aria-label="WhatsApp"
      title="WhatsApp"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M20 11.9C20 16.4 16.4 20 11.9 20c-1.4 0-2.8-.4-4-.9L4 20l1-3.7c-.6-1.2-1-2.6-1-4.3C4 7.5 7.5 4 11.9 4 16.4 4 20 7.5 20 11.9Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M10 9.3c.3-.5.6-.6 1.1-.4.4.2.9.6 1 .9.1.3 0 .7-.2 1-.2.3-.4.5-.2.8.3.6 1 1.4 1.7 1.7.3.2.5 0 .8-.2.3-.2.7-.3 1-.2.3.1.7.6.9 1 .2.5.1.8-.4 1.1-.8.6-1.8.8-2.8.4-1.7-.7-3.8-2.8-4.5-4.5-.4-1-.2-2 .4-2.8Z"
          fill="currentColor"
        />
      </svg>
    </a>
  );
}
