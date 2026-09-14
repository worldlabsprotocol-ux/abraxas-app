"use client";
// FILE: app/vault/layout.tsx
// Vault marketplace shell.

import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout accent="home" maxWidth={980}>{children}</AbxSectionLayout>;
}
