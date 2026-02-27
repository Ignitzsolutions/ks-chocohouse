"use client";

const BULK_STATUS_OPTIONS = ["Baking", "Out for Delivery", "Delivered", "Cancelled"];

type Props = {
  selectedCount: number;
  busy?: boolean;
  onClear: () => void;
  onExportSelected: () => void;
  onApplyStatus: (status: string) => void;
};

export function SalesBulkActions({
  selectedCount,
  busy = false,
  onClear,
  onExportSelected,
  onApplyStatus,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2">
      <span className="text-sm font-semibold text-black/70">
        {selectedCount} selected
      </span>
      <button
        type="button"
        onClick={onExportSelected}
        disabled={selectedCount === 0 || busy}
        className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
      >
        Export Selected CSV
      </button>
      {BULK_STATUS_OPTIONS.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onApplyStatus(status)}
          disabled={selectedCount === 0 || busy}
          className="rounded-lg border border-black/10 bg-[color:var(--cream)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        >
          {status}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        disabled={selectedCount === 0 || busy}
        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-black/50 disabled:opacity-40"
      >
        Clear
      </button>
    </div>
  );
}

