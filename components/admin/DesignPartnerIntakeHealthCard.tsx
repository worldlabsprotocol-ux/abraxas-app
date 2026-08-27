"use client";
// FILE: components/admin/DesignPartnerIntakeHealthCard.tsx
// Read-only design-partner intake configuration health card.

import { useEffect, useRef, useState } from "react";
import type { ProductionAdminRequest } from "@/lib/admin/productionAdminSessionUi";
import {
  intakeHealthBlockers,
  intakeHealthCriticalBlockers,
  intakeHealthHeadline,
  parseDesignPartnerIntakeHealthResponse,
} from "@/lib/admin/designPartnerIntakeHealthUi";
import { MIGRATION_071_OPERATOR_ATTESTATION } from "@/lib/admin/designPartnerIntakeHealthContract";
import type { DesignPartnerIntakeHealthReport } from "@/lib/admin/designPartnerIntakeHealthContract";

const FONT = "'Inter',system-ui,sans-serif";
const READY = "#10B981";
const WARN = "#F59E0B";
const CRITICAL = "#F87171";

export function DesignPartnerIntakeHealthCard({
  authorized,
  loading,
  adminRequest,
}: {
  authorized: boolean;
  loading: boolean;
  adminRequest: ProductionAdminRequest;
}) {
  const [report, setReport] = useState<DesignPartnerIntakeHealthReport | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const fetchedForAuthorizationRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!authorized) {
      fetchedForAuthorizationRef.current = false;
      setReport(null);
      setUnavailable(false);
      return;
    }

    if (fetchedForAuthorizationRef.current) {
      return;
    }

    fetchedForAuthorizationRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const res = await adminRequest("/api/admin/design-partners/intake-health", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          setUnavailable(true);
          return;
        }
        if (!res.ok) {
          setUnavailable(true);
          return;
        }
        const payload = await res.json();
        const parsed = parseDesignPartnerIntakeHealthResponse(payload);
        if (!cancelled) {
          setReport(parsed);
          setUnavailable(false);
        }
      } catch {
        if (!cancelled) {
          setUnavailable(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authorized, loading, adminRequest]);

  if (!authorized || loading) {
    return null;
  }

  if (unavailable || !report) {
    return (
      <section
        data-testid="design-partner-intake-health"
        aria-label="Application intake health"
        style={{
          padding: "0.85rem 1rem",
          borderRadius: 12,
          border: "1px solid rgba(248,113,113,0.35)",
          marginBottom: "0.75rem",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: CRITICAL, margin: 0 }}>
          Application intake health unavailable.
        </p>
      </section>
    );
  }

  const status = report.overall_status;
  const accent = status === "ready" ? READY : status === "degraded" ? WARN : CRITICAL;
  const blockers = status === "misconfigured"
    ? intakeHealthCriticalBlockers(report)
    : status === "degraded"
      ? intakeHealthBlockers(report)
      : [];

  return (
    <section
      data-testid="design-partner-intake-health"
      aria-label="Application intake health"
      style={{
        padding: "0.85rem 1rem",
        borderRadius: 12,
        border: `1px solid ${accent}55`,
        marginBottom: "0.75rem",
        background: `${accent}10`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: accent, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Application intake health
          </div>
          <div
            data-testid="design-partner-intake-health-status"
            style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.2rem" }}
          >
            {intakeHealthHeadline(status)}
          </div>
        </div>
      </div>

      {blockers.length > 0 && (
        <ul style={{ margin: "0.65rem 0 0", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      )}

      <p
        data-testid="design-partner-intake-health-migration-attestation"
        style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.65rem 0 0", lineHeight: 1.55 }}
      >
        {MIGRATION_071_OPERATOR_ATTESTATION.copy}
      </p>
    </section>
  );
}
