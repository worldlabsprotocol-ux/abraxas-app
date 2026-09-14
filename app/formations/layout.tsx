"use client";
// FILE: app/formations/layout.tsx

import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function FormationsLayout({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout accent="neutral">{children}</AbxSectionLayout>;
}
