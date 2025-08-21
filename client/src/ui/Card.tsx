import React from "react";
import clsx from "clsx";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "elevated" | "surface" | "ghost";
  padded?: boolean;
};

export function Card({ variant="elevated", padded=true, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        // base
        "rounded-2xl border transition-all duration-200",
        // variants with proper theme-aware styling
        variant === "elevated" && "bg-card/90 border-dim shadow-elev-2 hover:shadow-elev-3 hover:border-dimStrong",
        variant === "surface"  && "bg-surface/80 border-dim shadow-elev-1 hover:shadow-elev-2",
        variant === "ghost"    && "bg-surface/30 border-dim hover:bg-surface/50",
        padded && "p-5",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("px-5 py-4 border-b border-dim bg-surface/20", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={clsx("text-lg font-semibold text-fg", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx("text-sm text-soft mt-1", className)} {...props} />;
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("p-5 text-fg", className)} {...props} />;
}