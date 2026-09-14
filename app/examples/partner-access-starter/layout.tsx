"use client";
// FILE: app/examples/partner-access-starter/layout.tsx
// Developer starter example shell.

import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function PartnerAccessStarterLayout({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout accent="developer" maxWidth={820}>{children}</AbxSectionLayout>;
}
