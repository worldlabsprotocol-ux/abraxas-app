import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  /** Max width tier — defaults to 'md' (4xl ~ 56rem) */
  size?: "sm" | "md" | "lg" | "full";
  /** Vertical padding — defaults to 'md' */
  padding?: "sm" | "md" | "lg";
}

const sizes: Record<NonNullable<LayoutProps["size"]>, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  full: "max-w-7xl",
};

const paddings: Record<NonNullable<LayoutProps["padding"]>, string> = {
  sm: "py-6",
  md: "py-8 md:py-10",
  lg: "py-12 md:py-16",
};

/**
 * Standard page wrapper. Provides consistent
 * horizontal padding, max-width, and vertical spacing.
 */
export function Layout({
  children,
  size = "md",
  padding = "md",
}: LayoutProps) {
  return (
    <div className={`mx-auto px-4 md:px-6 ${sizes[size]} ${paddings[padding]}`}>
      {children}
    </div>
  );
}
