"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AbxCard, AbxSkeleton, AbxStatusBadge } from "@/components/design/AbxPrimitives";
import {
  protocolStateLabel,
  protocolStateTone,
  type ProtocolEvidenceKind,
} from "@/lib/design/protocolStatePresentation";
import { ABX_FONT_MONO, ABX_FONT_SANS, ABX_TYPOGRAPHY } from "@/lib/design/abraxasDesignSystem";
import { buildHomepageMetricsView, type PublicMetricsPayload } from "@/lib/home/publicMetrics";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

type RegistryPayload = {
  issuers?: unknown[];
  schemas?: unknown[];
  error?: string;
};

type ReadinessRow = {
  label: string;
  value: string;
  detail: string;
  kind: ProtocolEvidenceKind;
  href?: string;
};

export function HomeOperationalReadiness() {
  const [registry, setRegistry] = useState<RegistryPayload | null>(null);
  const [metrics, setMetrics] = useState<PublicMetricsPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [regRes, metRes] = await Promise.all([
        fetch("/api/trust/registry"),
        fetch("/api/metrics/public"),
      ]);
      const regJson = (await regRes.json()) as RegistryPayload;
      const metJson = metRes.ok ? ((await metRes.json()) as PublicMetricsPayload) : null;
      if (!regRes.ok && !regJson.error) regJson.error = "registry_unavailable";
      setRegistry(regJson);
      setMetrics(metJson);
      setStatus("ready");
    } catch {
      setRegistry(null);
      setMetrics(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metricsView = buildHomepageMetricsView(metrics);
  const issuerCount = registry?.issuers?.length;
  const schemaCount = registry?.schemas?.length;

  const rows: ReadinessRow[] = [];

  if (status === "loading") {
    return (
      <section aria-labelledby="operational-readiness-heading" className="abx-institutional-section">
        <h2 id="operational-readiness-heading" className="abx-institutional-section__title">
          Operational surface (live APIs)
        </h2>
        <AbxCard padding="1.25rem">
          <AbxSkeleton height={12} width="40%" />
          <AbxSkeleton height={48} style={{ marginTop: 12 }} />
        </AbxCard>
      </section>
    );
  }

  if (registry?.error) {
    rows.push({
      label: "Trust Registry API",
      value: "Unavailable",
      detail: registry.error,
      kind: "unavailable",
      href: "/integrations#trust-registry",
    });
  } else {
    rows.push({
      label: "Trust Registry",
      value: `${issuerCount ?? 0} issuers · ${schemaCount ?? 0} schemas`,
      detail: "Public issuer and schema registry for relying parties.",
      kind: "policy_evaluated",
      href: "/api/trust/registry",
    });
  }

  rows.push({
    label: "Decision verification",
    value: "Public verifier",
    detail: "Independently check signed receipts — UI does not substitute for verification.",
    kind: "verified_independent",
    href: "/verify",
  });

  rows.push({
    label: "Solana enforcement",
    value: "Devnet evidence",
    detail: "On-chain revocation and registry proofs are published with devnet labels only.",
    kind: "devnet_labeled",
    href: "/proofs/solana-devnet",
  });

  if (metricsView.phase) {
    rows.push({
      label: "Deployment phase",
      value: metricsView.phase,
      detail: metricsView.updatedAt
        ? `Metrics updated ${new Date(metricsView.updatedAt).toLocaleString()}`
        : "From /api/metrics/public",
      kind: "policy_evaluated",
    });
  } else if (status === "error") {
    rows.push({
      label: "Public metrics",
      value: "Unavailable",
      detail: "Metrics API did not respond — no placeholder counters shown.",
      kind: "unavailable",
    });
  } else {
    rows.push({
      label: "Public metrics",
      value: metricsView.cards.length ? `${metricsView.cards.length} qualifying signals` : "No public volume threshold met",
      detail: "Homepage hides low-volume beta counters to avoid credibility noise.",
      kind: "unverified",
      href: "/api/metrics/public",
    });
  }

  return (
    <section aria-labelledby="operational-readiness-heading" className="abx-institutional-section">
      <h2 id="operational-readiness-heading" className="abx-institutional-section__title">
        Operational surface (live APIs)
      </h2>
      <p className="abx-institutional-section__lead">
        States below are loaded from Abraxas APIs — not decorative dashboard metrics.
      </p>
      <div className="abx-institutional-readiness-table" role="table">
        {rows.map((row) => (
          <AbxCard key={row.label} padding="0.85rem 1rem" style={{ marginBottom: "0.55rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "0.65rem",
                alignItems: "start",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.86rem", color: "var(--text-primary)" }}>
                    {row.label}
                  </span>
                  <AbxStatusBadge label={protocolStateLabel(row.kind)} tone={protocolStateTone(row.kind)} />
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.78rem",
                    color: "var(--accent)",
                    marginTop: "0.25rem",
                  }}
                >
                  {row.href ? (
                    <Link href={row.href} style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
                      {row.value}
                    </Link>
                  ) : (
                    row.value
                  )}
                </div>
                <p style={{ margin: "0.35rem 0 0", fontFamily: FONT, ...ABX_TYPOGRAPHY.small, color: "var(--text-secondary)" }}>
                  {row.detail}
                </p>
              </div>
            </div>
          </AbxCard>
        ))}
      </div>
    </section>
  );
}
