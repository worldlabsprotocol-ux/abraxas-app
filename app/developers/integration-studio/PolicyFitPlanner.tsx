"use client";
// FILE: app/developers/integration-studio/PolicyFitPlanner.tsx
// Structured pack finder. Applies to existing Studio pack and path state.

import { useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import {
  POLICY_FIT_ACTION_LABELS,
  POLICY_FIT_ACTIONS,
  POLICY_FIT_API_PATH,
  POLICY_FIT_CAPABILITIES,
  POLICY_FIT_CAPABILITY_LABELS,
  POLICY_FIT_CATEGORIES,
  POLICY_FIT_CATEGORY_LABELS,
  POLICY_FIT_ENVIRONMENTS,
  POLICY_FIT_ENVIRONMENT_LABELS,
  POLICY_FIT_GOOGLE,
  POLICY_FIT_REVIEW_NOTICE,
  type PolicyFitAction,
  type PolicyFitCapability,
  type PolicyFitCategory,
  type PolicyFitEnvironment,
} from "@/lib/partner/integrationStudio/policyFit/contract";
import { studioCapsFromFit, type PolicyFitView } from "@/lib/partner/integrationStudio/policyFit/match";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

const chip = (active: boolean, accent: string): React.CSSProperties => ({
  padding: "0.45rem 0.75rem",
  borderRadius: 999,
  border: active ? `1px solid ${accent}` : "1px solid var(--border)",
  background: active ? "rgba(45,212,191,0.12)" : "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: "0.74rem",
  fontWeight: 600,
  cursor: "pointer",
});

export function PolicyFitPlanner({
  onApply,
}: {
  onApply: (selection: { packId: string; pathId: IntegrationStudioPathId; capabilities: string[] }) => void;
}) {
  const [action, setAction] = useState<PolicyFitAction>("retail_access");
  const [category, setCategory] = useState<PolicyFitCategory>("age_21");
  const [environment, setEnvironment] = useState<PolicyFitEnvironment>("sandbox");
  const [capabilities, setCapabilities] = useState<PolicyFitCapability[]>(["reusable_result"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PolicyFitView | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleCap(id: PolicyFitCapability) {
    if (id === "reusable_result") return;
    setCapabilities((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  async function findFit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(POLICY_FIT_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, category, environment, capabilities }),
      });
      const data = await res.json() as PolicyFitView & { error?: string };
      if (!res.ok) {
        setError("Those choices could not be used. Pick from the listed options.");
        setResult(null);
        return;
      }
      setResult(data);
    } catch {
      setError("Policy fit is temporarily unavailable.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentCard title="Find the right policy">
      <p style={{ ...body, marginBottom: "0.75rem" }}>
        Describe the product gate in structured choices. Studio matches existing policy packs only. {POLICY_FIT_REVIEW_NOTICE}
      </p>

      <fieldset style={{ border: 0, margin: 0, padding: 0, marginBottom: "0.85rem" }}>
        <legend style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
          What action do you want to gate?
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {POLICY_FIT_ACTIONS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={action === id}
              onClick={() => setAction(id)}
              style={chip(action === id, "rgba(45,212,191,0.55)")}
            >
              {POLICY_FIT_ACTION_LABELS[id]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0, marginBottom: "0.85rem" }}>
        <legend style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
          Which eligibility category matters?
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {POLICY_FIT_CATEGORIES.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
              style={chip(category === id, "rgba(45,212,191,0.55)")}
            >
              {POLICY_FIT_CATEGORY_LABELS[id]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0, marginBottom: "0.85rem" }}>
        <legend style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
          Environment
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {POLICY_FIT_ENVIRONMENTS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={environment === id}
              onClick={() => setEnvironment(id)}
              style={chip(environment === id, "rgba(99,102,241,0.55)")}
            >
              {POLICY_FIT_ENVIRONMENT_LABELS[id]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0, marginBottom: "0.85rem" }}>
        <legend style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
          Integration needs
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {POLICY_FIT_CAPABILITIES.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={capabilities.includes(id)}
              disabled={id === "reusable_result"}
              onClick={() => toggleCap(id)}
              style={chip(capabilities.includes(id), "rgba(99,102,241,0.55)")}
            >
              {POLICY_FIT_CAPABILITY_LABELS[id]}
            </button>
          ))}
        </div>
      </fieldset>

      <Btn size="sm" loading={busy} disabled={busy} onClick={() => void findFit()}>
        Find matching policy pack
      </Btn>
      {error && (
        <p role="status" style={{ ...body, color: "var(--danger, #f87171)", marginTop: "0.7rem" }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: "1rem" }}>
          {result.fit && result.recommended ? (
            <article aria-labelledby="policy-fit-result-heading">
              <h3 id="policy-fit-result-heading" style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800, margin: "0 0 0.45rem" }}>
                Recommended pack: {result.recommended.pack_display_name}
              </h3>
              <p role="status" style={{ ...body, marginBottom: "0.45rem" }}>
                Fit found. Catalog version {result.recommended.catalog_version}.
              </p>
              <dl style={{ display: "grid", gap: "0.45rem", margin: 0 }}>
                {[
                  ["Policy result the partner receives", result.recommended.policy_result],
                  ["Required method category", result.recommended.method_category],
                  ["Withheld", result.recommended.withheld.join(", ")],
                  ["Production path", result.recommended.production_path],
                  ["Why this pack fits", result.recommended.why],
                  ["Starter Kit platforms", result.recommended.starter_kit_platforms.join(", ")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt style={{ ...body, color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</dt>
                    <dd style={{ ...body, margin: "0.2rem 0 0", color: "var(--text-primary)" }}>{v}</dd>
                  </div>
                ))}
              </dl>
              <p style={{ ...body, marginTop: "0.7rem" }}>{result.recommended.google_is_account_only}</p>
              <p style={{ ...body, marginTop: "0.35rem" }}>{result.recommended.identity_appears_only_when_required}</p>
              <p style={{ ...body, marginTop: "0.35rem" }}>{POLICY_FIT_GOOGLE}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
                <Btn
                  size="sm"
                  onClick={() => onApply({
                    packId: result.recommended!.pack_id,
                    pathId: result.recommended!.selected_path,
                    capabilities: studioCapsFromFit(result.intent.capabilities),
                  })}
                >
                  Use this pack in Studio
                </Btn>
                <Btn href="/developers/launchpad#policy-proposal" size="sm" variant="secondary">Propose a policy</Btn>
              </div>
            </article>
          ) : (
            <article aria-labelledby="policy-fit-nofit-heading">
              <h3 id="policy-fit-nofit-heading" style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800, margin: "0 0 0.45rem" }}>
                Talk to us about a policy fit
              </h3>
              <p role="status" style={{ ...body, marginBottom: "0.65rem" }}>{result.no_fit_message}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <Btn href={`/developers/launchpad#policy-proposal`} size="sm">Propose a policy</Btn>
                <Btn href={result.design_partner_href} size="sm" variant="secondary">Talk to us about a policy fit →</Btn>
              </div>
            </article>
          )}
          <p style={{ ...body, marginTop: "0.85rem" }}>{result.review_notice}</p>
          <p style={{ ...body, marginTop: "0.45rem" }}>
            <Link href={result.design_partner_href} style={{ color: "var(--accent)", fontWeight: 700 }}>
              Design Partner
            </Link>
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(result.copyable_summary).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              });
            }}
            style={{ ...chip(false, "var(--border)"), marginTop: "0.55rem" }}
          >
            {copied ? "Summary copied" : "Copy structured summary"}
          </button>
        </div>
      )}
    </ContentCard>
  );
}
