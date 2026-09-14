"use client";
// FILE: app/api/auth/layout.tsx
// Auth API surface pages (sign in helpers).

import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function ApiAuthLayout({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout accent="passport" maxWidth={520}>{children}</AbxSectionLayout>;
}
