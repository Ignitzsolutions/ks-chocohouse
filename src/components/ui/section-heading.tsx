import type { HTMLAttributes } from "react";

export function SectionHeading({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`space-y-3 ${className ?? ""}`} {...props} />
  );
}
