import type { ButtonHTMLAttributes } from "react";

const base =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--berry)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--vanilla)] disabled:opacity-60 disabled:cursor-not-allowed";

const variants = {
  primary:
    "bg-gradient-to-b from-[color:var(--berry)] to-[color:var(--berry-dark)] text-white shadow-[0_14px_28px_rgba(32,22,16,0.24)] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/20 before:content-[''] hover:shadow-[0_20px_36px_rgba(32,22,16,0.28)]",
  outline:
    "border border-[color:var(--line)] bg-white/90 text-[color:var(--ink)] hover:bg-white",
  ghost: "text-[color:var(--ink)] hover:bg-[color:var(--ink)]/5",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
      {...props}
    />
  );
}
