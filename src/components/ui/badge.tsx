import { memo, type HTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "sale" | "rent" | "success" | "warning";
  children: ReactNode;
}

/**
 * Badge component for status indicators
 * Memoized to prevent unnecessary re-renders
 */
export const Badge = memo(function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    sale: "bg-emerald-50 text-emerald-700",
    rent: "bg-sky-50 text-sky-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});
