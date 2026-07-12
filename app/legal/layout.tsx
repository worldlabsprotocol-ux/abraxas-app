"use client";
// FILE: app/legal/layout.tsx
// Shared in-app shell for all legal routes — same nav, footer, auth as rest of app.

import { RedesignPage } from "@/components/redesign/RedesignPage";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RedesignPage maxWidth={780}>
      {children}
    </RedesignPage>
  );
}
