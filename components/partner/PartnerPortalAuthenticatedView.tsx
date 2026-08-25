"use client";
// FILE: components/partner/PartnerPortalAuthenticatedView.tsx
// Capability-aware authenticated partner portal body — scoped to this API key only.

import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerSandboxIntegrationPanel } from "@/components/partner/PartnerSandboxIntegrationPanel";
import type { CapabilityAwarePortalOnboarding } from "@/lib/partner/partnerPortalCapabilities";
import {
  PORTAL_CAPABILITY_SCOPE_NOTICE,
  PORTAL_UNSUPPORTED_SCOPE_NOTICE,
  resolvePortalCapabilities,
  shouldShowMainnetGate,
} from "@/lib/partner/partnerPortalCapabilities";
import type { PartnerDashboardReadiness } from "@/lib/partner/partnerPortalReadiness";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export interface PartnerPortalAuthenticatedViewProps {
  apiKey: string;
  partnerId: string;
  company: string | null;
  status: string | null;
  keyPrefix: string;
  scopes: string[];
  stats: {
    calls_30d: number;
    success_30d: number;
    success_rate: number | null;
    calls_7d: number;
  };
  recentEvents: Array<{
    endpoint: string;
    decision: string | null;
    created_at: string;
  }>;
  onboarding: CapabilityAwarePortalOnboarding;
  readiness: PartnerDashboardReadiness;
  mainnetGate: { eligible: boolean; criteria: string };
  onLogout: () => void;
}

const btnStyle: React.CSSProperties = {
  padding: "0.6rem 1rem",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "#1a1408",
  fontFamily: FONT,
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer",
};

export function PartnerPortalAuthenticatedView({
  apiKey,
  partnerId,
  company,
  status,
  keyPrefix,
  scopes,
  stats,
  recentEvents,
  onboarding,
  readiness,
  mainnetGate,
  onLogout,
}: PartnerPortalAuthenticatedViewProps) {
  const capabilities = resolvePortalCapabilities(scopes);
  const showMainnetGate = shouldShowMainnetGate({
    scopes,
    keyEnvironment: readiness.key_environment,
  });

  return (
    <>
      <ContentCard title={`${company ?? partnerId}`}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
            {keyPrefix}… · {status ?? "unknown"} · scopes: {scopes.join(", ") || "none"}
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              ...btnStyle,
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              padding: "0.35rem 0.65rem",
              fontSize: "0.68rem",
            }}
          >
            Sign out
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem", marginTop: "0.75rem" }}>
          {[
            { label: "30d calls", value: stats.calls_30d },
            { label: "7d calls", value: stats.calls_7d },
            { label: "Success rate", value: stats.success_rate != null ? `${stats.success_rate}%` : "—" },
          ].map(stat => (
            <div key={stat.label} style={{ padding: "0.65rem", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)" }}>{stat.label}</div>
              <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Onboarding progress">
        <p
          data-testid="onboarding-headline"
          style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0 0 0.35rem" }}
        >
          {onboarding.completed}/{onboarding.total} configuration steps complete for this key
        </p>
        <p
          data-testid="portal-capability-notice"
          style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0 0 0.65rem" }}
        >
          {capabilities.hasPortalIntegration
            ? PORTAL_CAPABILITY_SCOPE_NOTICE
            : PORTAL_UNSUPPORTED_SCOPE_NOTICE}
        </p>
        {capabilities.hasPortalIntegration && (
          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0 0 0.65rem" }}>
            {readiness.sandbox_notice}
          </p>
        )}
        <div style={{ display: "grid", gap: "0.45rem" }}>
          {onboarding.steps.map(step => (
            <div
              key={step.id}
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: 10,
                border: `1px solid ${step.done ? "rgba(232,197,71,0.35)" : "var(--border)"}`,
                background: step.done ? "rgba(232,197,71,0.06)" : "transparent",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, color: step.done ? "var(--accent)" : "var(--text-primary)" }}>
                {step.done ? "✓" : "○"} {step.title}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </ContentCard>

      <PartnerSandboxIntegrationPanel
        apiKey={apiKey}
        partnerId={partnerId}
        scopes={scopes}
        readiness={readiness}
      />

      {showMainnetGate && (
        <div data-testid="mainnet-gate-card">
          <ContentCard title="Mainnet gate #5">
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.5rem" }}>
              {mainnetGate.criteria}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: mainnetGate.eligible ? "var(--accent)" : "var(--text-muted)", margin: 0 }}>
              {mainnetGate.eligible
                ? "✓ Your integration counts toward the external relying party gate"
                : "Not yet eligible. complete production verify with abx_live_ key"}
            </p>
          </ContentCard>
        </div>
      )}

      {recentEvents.length > 0 && (
        <ContentCard title="Recent API events">
          <div style={{ display: "grid", gap: "0.35rem" }}>
            {recentEvents.slice(0, 8).map((ev, i) => (
              <div key={`${ev.endpoint}-${i}`} style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)" }}>
                {ev.endpoint} · {ev.decision ?? "—"} · {new Date(ev.created_at).toLocaleString()}
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
        <Btn href="/integrations/relying-parties" size="sm">Integration docs →</Btn>
        {capabilities.verifyCapable && (
          <Btn href="/verify/ABX-RE-HOSP-001" variant="secondary" size="sm">
            Test verifier →
          </Btn>
        )}
      </div>
    </>
  );
}
