import type { ButtonHTMLAttributes } from "react";

const base =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden border font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--berry)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--vanilla)] disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary:
    "border-[color:var(--berry-dark)] bg-[color:var(--berry)] text-white shadow-[0_10px_18px_rgba(18,13,10,0.18)] hover:bg-[color:var(--berry-dark)]",
  outline:
    "border-[color:var(--line)] bg-white text-[color:var(--ink)] hover:bg-[color:var(--cream)]",
  ghost: "border-transparent bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--cream)]",
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
