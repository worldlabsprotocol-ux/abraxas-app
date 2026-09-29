"use client";
// FILE: components/demo/RelyingPartyPilotClient.tsx

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { PrivacyMinimizationComparison } from "@/components/demo/PrivacyMinimizationComparison";
import { RelyingPartyProgressSteps } from "@/components/demo/RelyingPartyProgressSteps";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import {
  RELYING_PARTY_PILOT_NOTICE,
  RELYING_PARTY_PILOT_PURPOSE,
  RELYING_PARTY_PILOT_REQUESTED_DISCLOSURE,
  type RelyingPartyPilotSlot,
} from "@/lib/demo/relyingPartyPilot/contract";
import type { RelyingPartyPilotMerchantConfig } from "@/lib/demo/relyingPartyPilot/config";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

type PilotConfig = {
  integration_studio_href: string;
  merchants: Record<RelyingPartyPilotSlot, RelyingPartyPilotMerchantConfig>;
};

const STORAGE_KEY = "abraxas.relying-party-pilot.merchant";

export function RelyingPartyPilotClient() {
  const [slot, setSlot] = useState<RelyingPartyPilotSlot>("a");
  const [config, setConfig] = useState<PilotConfig | null>(null);
  const [merchantOverride, setMerchantOverride] = useState<Partial<RelyingPartyPilotMerchantConfig> | null>(null);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    void fetch("/api/demo/relying-party/config").then(async (res) => {
      if (!res.ok) return;
      setConfig(await res.json() as PilotConfig);
    });
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setMerchantOverride(JSON.parse(raw) as Partial<RelyingPartyPilotMerchantConfig>);
    } catch {
      // ignore
    }
  }, []);

  const merchant = useMemo(() => {
    const base = config?.merchants[slot];
    if (!base) return null;
    if (!merchantOverride || merchantOverride.slot !== slot) return base;
    return {
      ...base,
      ...merchantOverride,
      slot,
    };
  }, [config, slot, merchantOverride]);

  const brief = useMemo(() => {
    if (!merchant) return null;
    const pack = POLICY_PACKS.age_21_retail;
    return buildHolderRequestBrief({
      partnerId: merchant.partner_id,
      partnerName: merchant.display_name,
      policyId: merchant.policy_id,
      purpose: merchant.purpose,
      environment: "sandbox",
      disclosedResult: pack.disclosed_result,
      userExplanation: pack.holder_explanation,
    });
  }, [merchant]);

  function persistSandboxHandoff(next: Partial<RelyingPartyPilotMerchantConfig>) {
    const merged = { ...next, slot };
    setMerchantOverride(merged);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <ContentCard title="Relying-party pilot · age 21+ eligibility">
        <p style={{ ...body, marginBottom: "0.75rem" }}>{RELYING_PARTY_PILOT_NOTICE}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.85rem" }}>
          {(["a", "b"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSlot(item)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: 999,
                border: slot === item ? "1px solid rgba(16,185,129,0.55)" : "1px solid var(--border)",
                background: slot === item ? "rgba(16,185,129,0.12)" : "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Partner {item.toUpperCase()}{item === "b" ? " · second relying partner" : ""}
            </button>
          ))}
        </div>
        {merchant && (
          <p style={body}>
            Policy pack <strong style={{ color: "var(--text-primary)" }}>age_21_retail</strong> · purpose{" "}
            <strong style={{ color: "var(--text-primary)" }}>{RELYING_PARTY_PILOT_PURPOSE}</strong> · requested disclosure{" "}
            <strong style={{ color: "var(--text-primary)" }}>{RELYING_PARTY_PILOT_REQUESTED_DISCLOSURE}</strong>
          </p>
        )}
      </ContentCard>

      <ContentCard title="Demo progress">
        <RelyingPartyProgressSteps activeStep="request" />
      </ContentCard>

      {brief && merchant && (
        <ContentCard title="What the holder sees before consent">
          <p style={{ ...body, marginBottom: "0.55rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {brief.requestor} is asking:
          </p>
          <p style={{ ...body, marginBottom: "0.75rem", fontSize: "0.92rem", color: "var(--text-primary)", fontWeight: 800 }}>
            Are you 21 or older?
          </p>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <p style={body}><strong>Purpose:</strong> {brief.purpose}</p>
            <p style={body}><strong>Shared:</strong> {brief.shared_result_category}</p>
            <p style={body}><strong>Not shared:</strong> {brief.withheld.join(", ")}</p>
          </div>
        </ContentCard>
      )}

      <ContentCard title="Start verification">
        {merchant ? (
          <>
            <p style={{ ...body, marginBottom: "0.75rem" }}>
              This opens Hosted Partner Flow. The holder completes Abraxas verification (or reuses current evidence), then returns to the pilot callback with a signed receipt id.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Btn href={merchant.verify_url} size="lg">Start age verification</Btn>
              <Btn href={config?.integration_studio_href ?? "/developers/integration-studio"} variant="secondary">
                Configure sandbox in Integration Studio
              </Btn>
            </div>
            {!merchant.configured && (
              <p style={{ ...body, marginBottom: "0.65rem" }}>
                Live sandbox not configured yet. Create a sandbox app pinned to <code>age_21_retail</code>, then paste its partner id / policy id / app slug below.
              </p>
            )}
            <details>
              <summary style={{ ...body, cursor: "pointer", fontWeight: 700, color: "var(--accent)" }}>Use my Launchpad sandbox credentials</summary>
              <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.65rem" }}>
                <label style={body}>
                  Partner id
                  <input defaultValue={merchant.partner_id} id="pilot-partner-id" style={inputStyle} />
                </label>
                <label style={body}>
                  Policy id
                  <input defaultValue={merchant.policy_id} id="pilot-policy-id" style={inputStyle} />
                </label>
                <label style={body}>
                  App slug (optional)
                  <input defaultValue={merchant.app_slug ?? ""} id="pilot-app-slug" style={inputStyle} />
                </label>
                <Btn
                  size="sm"
                  onClick={() => {
                    const partner_id = (document.getElementById("pilot-partner-id") as HTMLInputElement).value.trim();
                    const policy_id = (document.getElementById("pilot-policy-id") as HTMLInputElement).value.trim();
                    const app_slug = (document.getElementById("pilot-app-slug") as HTMLInputElement).value.trim();
                    persistSandboxHandoff({ partner_id, policy_id, app_slug: app_slug || null, configured: true });
                    window.location.reload();
                  }}
                >
                  Save sandbox binding
                </Btn>
              </div>
            </details>
          </>
        ) : (
          <p style={body}>Loading pilot configuration…</p>
        )}
      </ContentCard>

      <ContentCard title="Privacy minimization">
        <PrivacyMinimizationComparison sampleResult={{ age_eligible_21: true }} />
      </ContentCard>

      <ContentCard title="Optional: partner activity signal (not required for 21+ access)">
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          After receipt verification, a partner may optionally bind a consented activity category from its own records. This does not replace Abraxas verification.
        </p>
        <label style={{ ...body, display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.55rem" }}>
          <input type="checkbox" checked={showActivity} onChange={(e) => setShowActivity(e.target.checked)} />
          Show optional activity-signal developer note
        </label>
        {showActivity && (
          <p style={body}>
            Example preflight endpoint:{" "}
            <Link href="/api/examples/partner-activity-signal/preflight" style={{ color: "var(--accent)", fontWeight: 700 }}>
              /api/examples/partner-activity-signal/preflight
            </Link>
            . Requires a verified receipt plus a partner-owned category such as <code>repeat_participant</code>.
          </p>
        )}
      </ContentCard>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.25rem",
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: "0.78rem",
};
