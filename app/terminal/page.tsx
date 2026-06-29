"use client";
// FILE: app/terminal/page.tsx
// Homepage. Installment 1 of the from-scratch redesign (dark premium).
// The legacy experience remains in components/terminal/TerminalApp.tsx
// for section-by-section migration in the next installments.
import { Suspense } from "react";
import { RedesignHome } from "@/components/redesign/RedesignHome";

export default function TerminalPage() {
  return (
    <Suspense fallback={null}>
      <RedesignHome />
    </Suspense>
  );
}
