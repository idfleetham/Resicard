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
        "rounded-2xl border transition",
        // variants
        variant === "elevated" && "bg-card/90 border-dim shadow-[0_8px_24px_rgba(0,0,0,.25)] hover:shadow-[0_12px_36px_rgba(0,0,0,.35)] hover:border-dimStrong",
        variant === "surface"  && "bg-surface/80 border-dim",
        variant === "ghost"    && "bg-white/[0.03] border-dim",
        padded && "p-5",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("px-5 py-4 border-b border-dim", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={clsx("text-lg font-semibold text-fg", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx("text-sm text-soft", className)} {...props} />;
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("p-5", className)} {...props} />;
}