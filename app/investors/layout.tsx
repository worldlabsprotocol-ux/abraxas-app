// FILE: app/investors/layout.tsx
// Not indexed — avoid public solicitation surface; direct access only.

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Company materials (private)",
};

export default function InvestorsLayout({ children }: { children: ReactNode }) {
  return children;
}
