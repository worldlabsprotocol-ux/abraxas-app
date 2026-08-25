"use client";
// FILE: app/admin/partners/page.tsx
// Admin partner onboarding console + API key management.

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { PartnerOnboardingConsole } from "@/components/admin/PartnerOnboardingConsole";
import { AdminPartnerKeysPanel } from "@/components/admin/AdminPartnerKeysPanel";
import { PartnerMeteringPanel } from "@/components/admin/PartnerMeteringPanel";
import { PartnerWebhooksPanel } from "@/components/admin/PartnerWebhooksPanel";
import { PartnerWebhookObservabilityPanel } from "@/components/admin/PartnerWebhookObservabilityPanel";
import { PartnerWebhookSandboxReceiptsPanel } from "@/components/admin/PartnerWebhookSandboxReceiptsPanel";
import { useProductionAdminSessionGate } from "@/lib/admin/productionAdminSessionUi";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

type Tab = "onboarding" | "keys" | "usage" | "webhooks" | "observability" | "sandbox-receipts";

export default function AdminPartnersPage() {
  const [tab, setTab] = useState<Tab>("onboarding");
  const gate = useProductionAdminSessionGate();

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
          <Link href="/admin/partner-flow" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            Partner Flow health →
          </Link>
          <Link href="/admin/identity" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            ← Identity queue
          </Link>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {(["onboarding", "keys", "usage", "webhooks", "observability", "sandbox-receipts"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              style={{
                padding: "0.45rem 0.9rem", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${tab === t ? `${ACCENT}66` : "rgba(255,255,255,0.12)"}`,
                background: tab === t ? "rgba(16,185,129,0.15)" : "transparent",
                color: tab === t ? ACCENT : "rgba(255,255,255,0.55)",
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              }}>
              {t === "onboarding"
                ? "Onboarding"
                : t === "keys"
                  ? "API keys"
                  : t === "usage"
                    ? "Usage metering"
                    : t === "webhooks"
                      ? "Webhooks"
                      : t === "observability"
                        ? "Delivery observability"
                        : "Sandbox receipts"}
            </button>
          ))}
          {gate.loading ? (
            <span
              data-testid="admin-partners-session-loading"
              style={{
                marginLeft: "auto",
                fontFamily: FONT,
                fontSize: "0.68rem",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Checking admin session…
            </span>
          ) : gate.usePinUnlock ? (
            <input
              type="password"
              value={gate.pin}
              onChange={e => gate.setPin(e.target.value)}
              placeholder="Admin PIN (if not signed in)"
              data-testid="admin-partners-pin-input"
              style={{
                marginLeft: "auto", padding: "0.45rem 0.75rem", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
                color: "#f0f0f0", fontFamily: MONO, fontSize: "0.68rem",
              }}
            />
          ) : null}
        </div>

        {gate.loading ? (
          <p
            data-testid="admin-partners-panel-loading"
            style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}
          >
            Checking admin session…
          </p>
        ) : tab === "onboarding" ? (
          <PartnerOnboardingConsole adminRequest={gate.adminRequest} />
        ) : tab === "keys" ? (
          <AdminPartnerKeysPanel adminRequest={gate.adminRequest} />
        ) : tab === "usage" ? (
          <PartnerMeteringPanel adminRequest={gate.adminRequest} />
        ) : tab === "webhooks" ? (
          <PartnerWebhooksPanel adminRequest={gate.adminRequest} />
        ) : tab === "observability" ? (
          <PartnerWebhookObservabilityPanel />
        ) : (
          <PartnerWebhookSandboxReceiptsPanel />
        )}
      </div>
    </div>
  );
}
