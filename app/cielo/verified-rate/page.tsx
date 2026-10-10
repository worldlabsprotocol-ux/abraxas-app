// FILE: app/cielo/verified-rate/page.tsx
// Cielo verified-rate request loop entry. not a booking or payment handoff.

import { Suspense } from "react";
import Link from "next/link";
import { CieloVerifiedRateFlow } from "@/components/cielo/CieloVerifiedRateFlow";

export default function CieloVerifiedRatePage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(1.5rem, 5vw, 3rem) clamp(1rem, 3vw, 2rem)" }}>
      <Link href="/flagship" style={{
        fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.72rem", fontWeight: 600,
        color: "#10B981", textDecoration: "none", display: "inline-block", marginBottom: "1rem",
      }}>
        ← Back to Cielo Sunrise
      </Link>
      <Suspense fallback={<p style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading…</p>}>
        <CieloVerifiedRateFlow />
      </Suspense>
    </div>
  );
}
