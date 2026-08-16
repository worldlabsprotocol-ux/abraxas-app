"use client";
// FILE: app/admin/partner-flow/page.tsx
// Read-only Partner Flow operational health (last 24h).

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PartnerFlowHealthPanel } from "@/components/admin/PartnerFlowHealthPanel";
import { adminFetch } from "@/lib/admin/adminFetch";
import type { PartnerFlowHealthReport } from "@/lib/partner/partnerFlowHealth";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

export default function AdminPartnerFlowHealthPage() {
  const [report, setReport] = useState<PartnerFlowHealthReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch("/api/admin/partner-flow/health", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as PartnerFlowHealthReport;
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load health report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Admin · Partner Flow
            </div>
            <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              Partner Flow Health
            </h1>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
              A plain-language view of partner API activity and abuse protection for the last 24 hours.
            </p>
          </div>
          <Link href="/admin/partners" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            ← Partners
          </Link>
        </div>

        {loading && <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: FONT }}>Loading…</p>}
        {error && <p style={{ color: "#f87171", fontFamily: FONT }}>{error}</p>}

        {report && <PartnerFlowHealthPanel report={report} />}
      </div>
    </div>
  );
}
