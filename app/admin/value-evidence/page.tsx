"use client";
// FILE: app/admin/value-evidence/page.tsx
// Operator value evidence — business proof without fabricated metrics.

import { useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { VALUE_EVIDENCE_NOTICE } from "@/lib/partner/valueEvidence/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type Scope = "application" | "portfolio";

export default function AdminValueEvidencePage() {
  const [scope, setScope] = useState<Scope>("portfolio");
  const [applicationId, setApplicationId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [payloadJson, setPayloadJson] = useState("");
  const [error, setError] = useState("");

  async function loadEvidence() {
    setError("");
    setPayloadJson("");
    const params = new URLSearchParams({ scope });
    if (scope === "application") {
      if (!applicationId.trim()) {
        setError("Application ID required for application scope");
        return;
      }
      params.set("application_id", applicationId.trim());
    } else if (partnerId.trim()) {
      params.set("partner_id", partnerId.trim());
    }
    const res = await fetch(`/api/admin/value-evidence?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? "Failed to load"));
      return;
    }
    setPayloadJson(JSON.stringify(scope === "portfolio" ? data.portfolio : data.evidence, null, 2));
  }

  return (
    <RedesignPage accent="admin" maxWidth={1080}>
      <ContentCard title="Value evidence">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 0 }}>
          Internal business proof layer — technical truth separated from operator commercial assertions.
        </p>
        <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: 0 }}>
          {VALUE_EVIDENCE_NOTICE}
        </p>
      </ContentCard>

      <ContentCard title="Lookup">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          Sections: lifecycle, integration velocity, conversion, expansion, repeat activity, evidence reuse,
          unit-economics readiness, ICP, product discipline, case-study readiness, GTM funnel, fundraising matrix,
          investor claims. Zero data shows zero — no vanity indicators.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem", alignItems: "center" }}>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as Scope)}
            style={{ fontFamily: FONT, fontSize: "0.78rem", padding: "0.35rem 0.5rem" }}
          >
            <option value="portfolio">portfolio</option>
            <option value="application">application</option>
          </select>
          {scope === "application" ? (
            <input
              type="text"
              placeholder="Application UUID"
              value={applicationId}
              onChange={(event) => setApplicationId(event.target.value)}
              style={{ fontFamily: MONO, fontSize: "0.78rem", padding: "0.35rem 0.5rem", minWidth: 280 }}
            />
          ) : (
            <input
              type="text"
              placeholder="Partner ID filter (optional)"
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              style={{ fontFamily: MONO, fontSize: "0.78rem", padding: "0.35rem 0.5rem", minWidth: 220 }}
            />
          )}
          <Btn size="sm" onClick={() => void loadEvidence()}>Load value evidence</Btn>
        </div>
        {error && <p style={{ fontFamily: FONT, color: "#ef4444", marginTop: "0.65rem" }}>{error}</p>}
      </ContentCard>

      {payloadJson && (
        <ContentCard title={scope === "portfolio" ? "Portfolio evidence" : "Application evidence"}>
          <pre style={{ fontFamily: MONO, fontSize: "0.65rem", overflow: "auto", maxHeight: 640, margin: 0 }}>
            {payloadJson}
          </pre>
        </ContentCard>
      )}
    </RedesignPage>
  );
}
