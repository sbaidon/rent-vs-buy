import { memo, forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  isLoading?: boolean;
}

/**
 * Button component following Vercel design system
 * Uses forwardRef for proper ref forwarding
 * Memoized to prevent unnecessary re-renders
 */
export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
      variant = "primary",
      size = "md",
      className,
      children,
      disabled,
      isLoading,
      ...props
    },
    ref
  ) {
    const baseStyles =
      "inline-flex items-center justify-center gap-1.5 sm:gap-2 font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-copper-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-xs";

    const variants = {
      primary:
        "bg-gradient-to-r from-copper-600 to-copper-700 text-white border border-copper-500 shadow-lg shadow-copper-500/20 hover:from-copper-500 hover:to-copper-600 hover:shadow-copper-500/30 active:shadow-sm",
      secondary:
        "bg-transparent border hover:opacity-80 active:opacity-70",
      ghost:
        "hover:text-copper-400 hover:bg-copper-500/10 active:bg-copper-500/20",
    };

    // Dynamic styles for theme-aware variants
    const getVariantStyle = () => {
      if (variant === "secondary") {
        return {
          borderColor: "var(--border-default)",
          color: "var(--text-secondary)",
        };
      }
      if (variant === "ghost") {
        return {
          color: "var(--text-muted)",
        };
      }
      return {};
    };

    const sizes = {
      sm: "px-3 py-1.5",
      md: "px-4 py-2.5",
      lg: "px-6 py-3",
    };

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        style={getVariantStyle()}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  })
);
