import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "ink";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-yellow text-ink",
  secondary: "bg-white text-ink",
  ghost: "bg-transparent text-ink",
  ink: "bg-ink text-cream",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full border-ink-3 font-semibold tracking-tight cursor-pointer select-none press press-hover shadow-doodle disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(base, variantClass[variant], sizeClass[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

type LinkButtonProps = CommonProps & {
  href: string;
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(base, variantClass[variant], sizeClass[size], className)}
    >
      {children}
    </Link>
  );
}
