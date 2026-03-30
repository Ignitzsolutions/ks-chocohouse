import type { HTMLAttributes } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "rose" | "sage" | "gold" | "ink";
};

const tones = {
  rose: "bg-[color:var(--cream)] text-[color:var(--berry-dark)] border-[color:var(--berry)]",
  sage: "bg-[color:var(--sage)] text-[color:var(--cocoa)] border-[color:var(--line)]",
  gold: "bg-[#e0ccb0] text-[color:var(--cocoa)] border-[color:var(--gold)]",
  ink: "bg-[#efe6dc] text-[color:var(--ink)] border-[color:var(--line)]",
};

export function Badge({ className, tone = "rose", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
        tones[tone]
      } ${className ?? ""}`}
      {...props}
    />
  );
}
