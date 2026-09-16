// FILE: app/stocklana/page.tsx
// Stocklana — Solana tokenized-stock eligibility demo.

import { Suspense } from "react";
import { StocklanaDemoClient } from "@/components/stocklana/StocklanaDemoClient";

export const dynamic = "force-dynamic";

export default function StocklanaPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", textAlign: "center" }}>Loading Stocklana…</p>}>
      <StocklanaDemoClient />
    </Suspense>
  );
}
