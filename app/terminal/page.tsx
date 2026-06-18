"use client";
// FILE: app/terminal/page.tsx
// Thin wrapper. All content in components/terminal/TerminalApp.tsx.
// Suspense boundary required because TerminalApp uses useSearchParams().
import { Suspense } from "react";
import TerminalApp from "@/components/terminal/TerminalApp";

export default function TerminalPage() {
  return (
    <Suspense fallback={null}>
      <TerminalApp />
    </Suspense>
  );
}
