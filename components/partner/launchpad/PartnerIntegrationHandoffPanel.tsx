"use client";
// FILE: components/partner/launchpad/PartnerIntegrationHandoffPanel.tsx
// Concise operator handoff for external relying partners.

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerBindingSelector } from "@/components/partner/launchpad/PartnerBindingSelector";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface HandoffView {
  application_id: string;
  public_slug: string;
  environment: string;
  policy_id: string;
  policy_version: number;
  policy_label: string;
  binding_id: string | null;
  pack_id: string | null;
  result_family: string | null;
  binding_environment: string;
  hosted_flow_pattern: string;
  hosted_handoff_pattern: string;
  approved_callback_class: string;
  server_verification_pattern: string;
  starter_kit_path: string;
  verify_recommended_api: string;
  outstanding_blockers: string[];
  privacy_boundary: string;
  optional_layers_note: string;
}

export function PartnerIntegrationHandoffPanel({ applicationId }: { applicationId: string | null }) {
  const [handoff, setHandoff] = useState<HandoffView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bindingId, setBindingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const params = bindingId ? `?binding_id=${encodeURIComponent(bindingId)}` : "";
      const res = await fetch(`/api/launchpad/applications/${applicationId}/integration-handoff${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Unable to load integration handoff.");
        setHandoff(null);
        return;
      }
      setHandoff(json.handoff as HandoffView);
    } catch {
      setError("Unable to load integration handoff.");
      setHandoff(null);
    } finally {
      setLoading(false);
    }
  }, [applicationId, bindingId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!applicationId) return null;

  return (
    <ContentCard title="Integration handoff">
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 0 }}>
        Production path summary for your engineering team.
      </p>
      <div style={{ fontFamily: FONT, display: "grid", gap: 12 }}>
        {loading && <p>Loading handoff…</p>}
        {error && <p style={{ color: "var(--danger, #b00020)" }}>{error}</p>}
        <PartnerBindingSelector
          applicationId={applicationId}
          selectedBindingId={bindingId}
          onSelect={setBindingId}
          label="Integration policy"
        />
        {handoff && (
          <>
            <dl className="abx-responsive-dl">
              <dt>App ID</dt><dd style={{ fontFamily: MONO }}>{handoff.application_id}</dd>
              <dt>Environment</dt><dd>{handoff.binding_environment ?? handoff.environment}</dd>
              <dt>Policy</dt><dd>{handoff.policy_label} · v{handoff.policy_version}</dd>
              {handoff.binding_id && (
                <>
                  <dt>Binding</dt><dd style={{ fontFamily: MONO }}>{handoff.binding_id}</dd>
                  <dt>Result family</dt><dd style={{ fontFamily: MONO }}>{handoff.result_family}</dd>
                </>
              )}
              <dt>Callback class</dt><dd>{handoff.approved_callback_class}</dd>
              <dt>Verify API</dt><dd style={{ fontFamily: MONO }}>{handoff.verify_recommended_api}</dd>
            </dl>
            <div>
              <strong>Hosted flow</strong>
              <pre className="abx-code-scroll" style={{ fontFamily: MONO, fontSize: 12, whiteSpace: "pre-wrap", margin: "0.35rem 0 0" }}>{handoff.hosted_flow_pattern}</pre>
            </div>
            <div>
              <strong>Server verification</strong>
              <pre className="abx-code-scroll" style={{ fontFamily: MONO, fontSize: 12, whiteSpace: "pre-wrap", margin: "0.35rem 0 0" }}>{handoff.server_verification_pattern}</pre>
            </div>
            <div>
              <strong>Starter Kit</strong>
              <p style={{ margin: "4px 0" }}>{handoff.starter_kit_path}</p>
            </div>
            <div>
              <strong>Production blockers</strong>
              {handoff.outstanding_blockers.length === 0 ? (
                <p style={{ margin: "4px 0" }}>None detected from server evidence.</p>
              ) : (
                <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
                  {handoff.outstanding_blockers.map((blocker) => (
                    <li key={blocker} style={{ fontFamily: MONO, fontSize: 13 }}>{blocker}</li>
                  ))}
                </ul>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13 }}>{handoff.privacy_boundary}</p>
            <p style={{ margin: 0, fontSize: 13 }}>{handoff.optional_layers_note}</p>
          </>
        )}
        <Btn onClick={() => void load()} disabled={loading}>Refresh handoff</Btn>
      </div>
    </ContentCard>
  );
}
