import { memo, forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

/**
 * Card component with glass effect option
 * Memoized to prevent unnecessary re-renders
 */
export const Card = memo(
  forwardRef<HTMLDivElement, CardProps>(function Card(
    { className, children, hover = false, padding = "md", ...props },
    ref
  ) {
    const paddingSizes = {
      none: "",
      sm: "p-3",
      md: "p-5",
      lg: "p-6",
    };

    return (
      <div
        ref={ref}
        className={clsx(
          "bg-white rounded-2xl border border-slate-100",
          "shadow-sm shadow-slate-100/50",
          hover && "transition-all duration-200 hover:shadow-md hover:shadow-slate-200/50 hover:-translate-y-0.5",
          paddingSizes[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  })
);

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = memo(function CardHeader({
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div className={clsx("mb-4", className)} {...props}>
      {children}
    </div>
  );
});

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
}

export const CardTitle = memo(function CardTitle({
  className,
  children,
  as: Component = "h3",
  ...props
}: CardTitleProps) {
  return (
    <Component
      className={clsx("font-semibold text-slate-900", className)}
      {...props}
    >
      {children}
    </Component>
  );
});
