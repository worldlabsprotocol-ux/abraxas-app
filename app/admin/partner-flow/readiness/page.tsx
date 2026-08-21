"use client";
// FILE: app/admin/partner-flow/readiness/page.tsx
// Production partner activation readiness console with promotion actions.

export const dynamic = "force-dynamic";

import Link from "next/link";
import { PartnerFlowProductionReadinessPanel } from "@/components/admin/PartnerFlowProductionReadinessPanel";
import { PartnerProductionEnvPromotionPanel } from "@/components/admin/PartnerProductionEnvPromotionPanel";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

export default function AdminPartnerFlowReadinessPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Admin · Partner Flow
            </div>
            <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              Production Partner Activation
            </h1>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
              Readiness checks and hardened production environment promotion for external design partners.
            </p>
          </div>
          <Link href="/admin/partner-flow" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            ← Partner Flow health
          </Link>
        </div>

        <div style={{ display: "grid", gap: "1.25rem" }}>
          <PartnerFlowProductionReadinessPanel />
          <PartnerProductionEnvPromotionPanel />
        </div>
      </div>
    </div>
  );
}
