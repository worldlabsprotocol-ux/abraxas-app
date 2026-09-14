"use client";
// FILE: app/auth/layout.tsx
// Authentication journey shell — Google sign in and callback flows.

import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout accent="passport">{children}</AbxSectionLayout>;
}
