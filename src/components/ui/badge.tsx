import type { HTMLAttributes } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "rose" | "sage" | "gold" | "ink";
};

const tones = {
  rose: "bg-gradient-to-r from-[color:var(--berry)]/14 to-[color:var(--berry)]/8 text-[color:var(--berry-dark)] border-[color:var(--berry)]/22",
  sage: "bg-[color:var(--sage)]/35 text-[color:var(--cocoa)] border-[color:var(--sage)]/70",
  gold: "bg-gradient-to-r from-[color:var(--gold)]/38 to-[color:var(--gold)]/18 text-[color:var(--cocoa)] border-[color:var(--gold)]/45",
  ink: "bg-black/5 text-[color:var(--ink)] border-black/10",
};

export function Badge({ className, tone = "rose", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
        tones[tone]
      } ${className ?? ""}`}
      {...props}
    />
  );
}
