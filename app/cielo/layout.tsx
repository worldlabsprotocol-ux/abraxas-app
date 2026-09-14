"use client";
// FILE: app/cielo/layout.tsx
// Cielo pilot journey shell.

import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function CieloLayout({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout accent="home" maxWidth={720}>{children}</AbxSectionLayout>;
}
