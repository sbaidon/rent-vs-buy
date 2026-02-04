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
    default: "",
    sale: "badge-sale",
    rent: "badge-rent",
    success: "badge-sale",
    warning: "bg-copper-500/15 text-copper-400 border border-copper-500/30",
  };

  const getDefaultStyle = () => {
    if (variant === "default") {
      return {
        background: "var(--bg-muted)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-default)",
      };
    }
    return {};
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-mono font-medium rounded uppercase tracking-wider",
        variants[variant],
        className
      )}
      style={getDefaultStyle()}
      {...props}
    >
      {children}
    </span>
  );
});
