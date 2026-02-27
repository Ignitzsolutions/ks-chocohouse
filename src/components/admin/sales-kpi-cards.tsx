"use client";

import { formatInr } from "@/lib/products";
import type { SalesSummaryResponse } from "@/types/admin-sales";

type Props = {
  summary: SalesSummaryResponse | null;
  loading?: boolean;
};

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="soft-card rounded-2xl p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{value}</p>
      <p className="mt-1 text-xs text-black/50">{hint}</p>
    </div>
  );
}

export function SalesKpiCards({ summary, loading = false }: Props) {
  const cards = summary?.cards;
  const totals = summary?.totals;
  const loadingText = loading && !summary ? "..." : "0";

  return (
    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        label="Today Orders"
        value={String(cards?.todayOrders ?? loadingText)}
        hint="Orders created today"
      />
      <KpiCard
        label="Today Revenue"
        value={cards ? formatInr(cards.todayRevenue) : loading ? "..." : formatInr(0)}
        hint="Verified payments today"
      />
      <KpiCard
        label="Payment Review"
        value={String(cards?.pendingPaymentCount ?? loadingText)}
        hint="Verification pending"
      />
      <KpiCard
        label="Awaiting Approval"
        value={String(cards?.awaitingApprovalCount ?? loadingText)}
        hint="Ready for action"
      />
      <KpiCard
        label="Today Deliveries"
        value={String(cards?.todayDeliveriesCount ?? loadingText)}
        hint="Delivery date = today"
      />
      <KpiCard
        label="Filtered Total"
        value={totals ? `${totals.filteredCount} / ${formatInr(totals.filteredRevenue)}` : loading ? "..." : `0 / ${formatInr(0)}`}
        hint="Rows / revenue in current filters"
      />
    </section>
  );
}

