"use client";
// FILE: app/admin/partners/page.tsx
// Admin partner onboarding console + API key management.

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PartnerOnboardingConsole } from "@/components/admin/PartnerOnboardingConsole";
import { AdminPartnerKeysPanel } from "@/components/admin/AdminPartnerKeysPanel";
import { PartnerMeteringPanel } from "@/components/admin/PartnerMeteringPanel";
import { PartnerWebhooksPanel } from "@/components/admin/PartnerWebhooksPanel";
import {
  ProductionAdminSessionStatus,
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
  useProductionAdminSessionGate,
} from "@/lib/admin/productionAdminSessionUi";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

type Tab = "onboarding" | "keys" | "usage" | "webhooks";

export default function AdminPartnersPage() {
  const gate = useProductionAdminSessionGate();
  const searchParams = useSearchParams();
  const initialPartnerId = searchParams.get("partner_id")?.trim() || null;
  const showPromotedBanner = searchParams.get("promoted") === "1";
  const [tab, setTab] = useState<Tab>("onboarding");
  const [pin, setPin] = useState("");

  if (gate.loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)" }}>Checking admin session…</p>
      </div>
    );
  }

  if (!gate.authorized) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {gate.usePinUnlock ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="password"
                value={gate.pin}
                onChange={(event) => gate.setPin(event.target.value)}
                placeholder="Admin PIN"
                style={{
                  padding: "0.45rem 0.75rem", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
                  color: "#f0f0f0", fontFamily: MONO, fontSize: "0.68rem",
                }}
              />
              <button type="button" onClick={gate.unlockWithPin}
                style={{ padding: "0.45rem 0.9rem", borderRadius: 8, border: "none", background: ACCENT, color: "#000", fontFamily: FONT, fontWeight: 700, cursor: "pointer" }}>
                Unlock
              </button>
            </div>
          ) : (
            <p role="alert" style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#FCA5A5", margin: 0, lineHeight: 1.6 }}>
              {PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE}
            </p>
          )}
        </div>
      </div>
    );
  }

  const effectivePin = gate.usePinUnlock ? pin : "";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Admin · Relying parties
            </div>
            <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              Partner Onboarding Console
            </h1>
          </div>
          <Link href="/admin/partner-flow/readiness" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            Production readiness →
          </Link>
          <Link href="/admin/design-partners" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            Design partner queue →
          </Link>
          <Link href="/admin/identity" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            ← Identity queue
          </Link>
        </div>

        <ProductionAdminSessionStatus
          gate={gate}
          style={{ fontFamily: FONT, fontSize: "0.76rem", color: ACCENT, marginBottom: "0.75rem" }}
        />

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {(["onboarding", "keys", "usage", "webhooks"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              style={{
                padding: "0.45rem 0.9rem", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${tab === t ? `${ACCENT}66` : "rgba(255,255,255,0.12)"}`,
                background: tab === t ? "rgba(16,185,129,0.15)" : "transparent",
                color: tab === t ? ACCENT : "rgba(255,255,255,0.55)",
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              }}>
              {t === "onboarding" ? "Onboarding" : t === "keys" ? "API keys" : t === "usage" ? "Usage metering" : "Webhooks"}
            </button>
          ))}
          {gate.usePinUnlock && (
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Admin PIN (if not signed in)"
              style={{
                marginLeft: "auto", padding: "0.45rem 0.75rem", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
                color: "#f0f0f0", fontFamily: MONO, fontSize: "0.68rem",
              }}
            />
          )}
        </div>

        {tab === "onboarding" ? (
          <PartnerOnboardingConsole
            adminPin={effectivePin}
            initialPartnerId={initialPartnerId}
            showPromotedBanner={showPromotedBanner}
            adminRequest={gate.usePinUnlock ? undefined : gate.adminRequest}
          />
        ) : tab === "keys" ? (
          <AdminPartnerKeysPanel pin={effectivePin} />
        ) : tab === "usage" ? (
          <PartnerMeteringPanel adminPin={effectivePin} />
        ) : (
          <PartnerWebhooksPanel adminPin={effectivePin} />
        )}
      </div>
    </div>
  );
}
