"use client";
// FILE: components/admin/PartnerFlowProductionReadinessPanel.tsx
// Read-only Production partner activation readiness console — browser session only.

import { useCallback, useEffect, useState } from "react";
import {
  fetchProvisioningPreflightReport,
  fetchSigningHealthReport,
  provisioningPreflightCheckItems,
  ReadinessFetchError,
  signingHealthCheckItems,
  type ProvisioningPreflightReport,
  type ReadinessCheckItem,
  type SigningHealthReport,
} from "@/lib/admin/partnerFlowReadinessUi";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

function ReadinessChecklist({
  title,
  summaryLabel,
  overallPass,
  items,
}: {
  title: string;
  summaryLabel: string;
  overallPass: boolean;
  items: ReadinessCheckItem[];
}) {
  return (
    <section
      aria-label={title}
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>{title}</h2>
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.62rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: overallPass ? ACCENT : "#f87171",
            fontWeight: 700,
          }}
        >
          {overallPass ? "Ready" : "Not ready"}
        </span>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "rgba(255,255,255,0.55)", margin: "0 0 0.85rem", lineHeight: 1.5 }}>
        {summaryLabel}
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.45rem" }}>
        {items.map((item) => (
          <li
            key={item.key}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.55rem",
              fontFamily: FONT,
              fontSize: "0.8rem",
              color: item.pass ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 18,
                flexShrink: 0,
                textAlign: "center",
                color: item.pass ? ACCENT : "#f87171",
                fontWeight: 800,
              }}
            >
              {item.pass ? "✓" : "✕"}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PartnerFlowProductionReadinessPanel() {
  const [signingReport, setSigningReport] = useState<SigningHealthReport | null>(null);
  const [signingError, setSigningError] = useState("");
  const [signingLoading, setSigningLoading] = useState(true);

  const [partnerId, setPartnerId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [returnUrl, setReturnUrl] = useState("");
  const [preflightReport, setPreflightReport] = useState<ProvisioningPreflightReport | null>(null);
  const [preflightError, setPreflightError] = useState("");
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightRan, setPreflightRan] = useState(false);

  const loadSigningHealth = useCallback(async () => {
    setSigningLoading(true);
    setSigningError("");
    setSigningReport(null);
    try {
      const report = await fetchSigningHealthReport();
      setSigningReport(report);
    } catch (error) {
      setSigningError(error instanceof ReadinessFetchError ? error.message : "Failed to load signing health.");
    } finally {
      setSigningLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSigningHealth();
  }, [loadSigningHealth]);

  async function runPreflight(event: React.FormEvent) {
    event.preventDefault();
    setPreflightLoading(true);
    setPreflightError("");
    setPreflightReport(null);
    setPreflightRan(true);
    try {
      const report = await fetchProvisioningPreflightReport({
        partnerId,
        policyId,
        returnUrl,
      });
      setPreflightReport(report);
    } catch (error) {
      setPreflightError(error instanceof ReadinessFetchError ? error.message : "Failed to run provisioning preflight.");
    } finally {
      setPreflightLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div
        style={{
          border: `1px solid ${ACCENT}44`,
          borderRadius: 12,
          padding: "0.85rem 1rem",
          background: "rgba(16,185,129,0.08)",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#D1FAE5", margin: 0, lineHeight: 1.55 }}>
          Production readiness check — does not provision a partner.
        </p>
      </div>

      {signingLoading && (
        <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: FONT, margin: 0 }}>Loading signing health…</p>
      )}
      {signingError && (
        <p role="alert" style={{ color: "#f87171", fontFamily: FONT, margin: 0 }}>{signingError}</p>
      )}
      {signingReport && (
        <ReadinessChecklist
          title="Environment & signing"
          summaryLabel="Checks receipt signing alignment and Production demo isolation before partner launch."
          overallPass={signingReport.ok === true}
          items={signingHealthCheckItems(signingReport)}
        />
      )}

      <section
        aria-label="Partner provisioning preflight"
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "1rem 1.1rem",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.35rem" }}>
          Partner provisioning preflight
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "rgba(255,255,255,0.55)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Enter the partner identifiers you plan to provision, then run the read-only preflight check.
        </p>

        <form onSubmit={(event) => void runPreflight(event)} style={{ display: "grid", gap: "0.75rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.65)" }}>Partner ID</span>
            <input
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              placeholder="partner_id"
              autoComplete="off"
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#f0f0f0",
                fontFamily: MONO,
                fontSize: "0.78rem",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.65)" }}>Policy ID</span>
            <input
              value={policyId}
              onChange={(event) => setPolicyId(event.target.value)}
              placeholder="policy_id"
              autoComplete="off"
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#f0f0f0",
                fontFamily: MONO,
                fontSize: "0.78rem",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.65)" }}>Return URL</span>
            <input
              value={returnUrl}
              onChange={(event) => setReturnUrl(event.target.value)}
              placeholder="https://…"
              autoComplete="off"
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#f0f0f0",
                fontFamily: MONO,
                fontSize: "0.78rem",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={preflightLoading || !partnerId.trim() || !policyId.trim() || !returnUrl.trim()}
            style={{
              justifySelf: "start",
              padding: "0.62rem 1rem",
              borderRadius: 8,
              border: "none",
              background: ACCENT,
              color: "#000",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: preflightLoading ? "wait" : "pointer",
              opacity: preflightLoading ? 0.7 : 1,
            }}
          >
            {preflightLoading ? "Running preflight…" : "Run provisioning preflight"}
          </button>
        </form>

        {preflightError && (
          <p role="alert" style={{ color: "#f87171", fontFamily: FONT, margin: "1rem 0 0" }}>{preflightError}</p>
        )}
        {preflightRan && !preflightLoading && preflightReport && (
          <div style={{ marginTop: "1rem" }}>
            <ReadinessChecklist
              title="Provisioning readiness"
              summaryLabel="Read-only checks against partner, policy, and callback allowlist configuration."
              overallPass={preflightReport.ok === true}
              items={provisioningPreflightCheckItems(preflightReport)}
            />
          </div>
        )}
      </section>
    </div>
  );
}
