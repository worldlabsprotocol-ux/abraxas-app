// FILE: app/cielo/verified-rate/page.tsx
// Cielo verified-rate request loop entry — not a booking or payment handoff.

import { Suspense } from "react";
import Link from "next/link";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { CieloVerifiedRateFlow } from "@/components/cielo/CieloVerifiedRateFlow";

export default function CieloVerifiedRatePage() {
  return (
    <RedesignShell>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem)" }}>
        <Link href="/flagship" style={{
          fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.72rem", fontWeight: 600,
          color: "#10B981", textDecoration: "none", display: "inline-block", marginBottom: "1rem",
        }}>
          ← Cielo Sunrise asset
        </Link>
        <Suspense fallback={<p style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading…</p>}>
          <SuiAuthProvider>
            <CieloVerifiedRateFlow />
          </SuiAuthProvider>
        </Suspense>
      </div>
    </RedesignShell>
  );
}
