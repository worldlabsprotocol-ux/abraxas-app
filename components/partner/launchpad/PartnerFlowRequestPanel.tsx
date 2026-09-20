"use client";
// FILE: components/partner/launchpad/PartnerFlowRequestPanel.tsx
// Configure the holder-facing Partner Flow request. Preview only — no OAuth.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HolderRequestBriefCard } from "@/components/partner/HolderRequestBriefCard";
import {
  PARTNER_FLOW_ACTIONS,
  PARTNER_FLOW_ACTION_LABELS,
  PARTNER_FLOW_REQUEST_ENTRY,
  PARTNER_FLOW_REVIEW_NOTICE,
} from "@/lib/partner/launchpad/partnerFlowRequest/contract";
import type { PartnerFlowRequestView } from "@/lib/partner/launchpad/partnerFlowRequest/view";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};
const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.3rem",
  padding: "0.55rem 0.7rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
};

export function PartnerFlowRequestPanel({
  applicationId,
  onContinue,
}: {
  applicationId: string;
  onContinue?: () => void;
}) {
  const [view, setView] = useState<PartnerFlowRequestView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [action, setAction] = useState<(typeof PARTNER_FLOW_ACTIONS)[number]>("retail_access");
  const [callbackIndex, setCallbackIndex] = useState(0);
  const [displayLabel, setDisplayLabel] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/partner-flow-request`, {
        credentials: "include",
      });
      const data = await res.json() as PartnerFlowRequestView & { error?: string };
      if (!res.ok) {
        setError("Could not load Partner Flow configuration.");
        setView(null);
        return;
      }
      setView(data);
      setPurpose(data.purpose ?? "");
      if (data.action) setAction(data.action);
      if (data.selected_callback_index != null) setCallbackIndex(data.selected_callback_index);
      setDisplayLabel(data.display_label);
      setCapabilities(data.capabilities);
    } catch {
      setError("Could not load Partner Flow configuration.");
    }
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function toggleCap(id: string) {
    setCapabilities((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/partner-flow-request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          action,
          callback_index: callbackIndex,
          display_label: displayLabel,
          capabilities,
        }),
      });
      const data = await res.json() as PartnerFlowRequestView & { error?: string };
      if (!res.ok) {
        setError(data.error === "callback_rejected"
          ? "Choose an approved callback. New URLs must be added on Destinations first."
          : data.error === "invalid_purpose"
            ? "Use a short plain-language purpose without links or special characters."
            : data.error === "capability_rejected"
              ? "Choose only capabilities already enabled for this sandbox app."
            : "Those settings could not be saved. Check the purpose, action, and callback.");
        return;
      }
      setView(data);
    } catch {
      setError("Could not save Partner Flow configuration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentCard title={PARTNER_FLOW_REQUEST_ENTRY}>
      <p style={{ ...body, marginBottom: "0.75rem" }}>{PARTNER_FLOW_REVIEW_NOTICE}</p>
      {error && <p role="alert" style={{ ...body, color: "var(--danger, #f87171)", marginBottom: "0.7rem" }}>{error}</p>}

      <label style={{ ...body, display: "block", marginBottom: "0.75rem" }}>
        Partner display label
        <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Uses the existing sandbox app name. This is what the holder sees as the requesting partner.
        </span>
        <input value={displayLabel} onChange={(event) => setDisplayLabel(event.target.value)} autoComplete="off" style={input} />
      </label>

      <label style={{ ...body, display: "block", marginBottom: "0.75rem" }}>
        Purpose
        <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Explain why the eligibility result is needed. 12–160 characters. No links or personal data.
        </span>
        <textarea
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          rows={3}
          style={{ ...input, resize: "vertical" }}
        />
      </label>

      <fieldset style={{ border: 0, margin: "0 0 0.85rem", padding: 0 }}>
        <legend style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
          Named action
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {PARTNER_FLOW_ACTIONS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={action === id}
              onClick={() => setAction(id)}
              style={{
                padding: "0.4rem 0.7rem",
                borderRadius: 999,
                border: action === id ? "1px solid rgba(45,212,191,0.55)" : "1px solid var(--border)",
                background: action === id ? "rgba(45,212,191,0.12)" : "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {PARTNER_FLOW_ACTION_LABELS[id]}
            </button>
          ))}
        </div>
      </fieldset>

      <label style={{ ...body, display: "block", marginBottom: "0.75rem" }}>
        Approved callback
        <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Select a destination already allowlisted for this sandbox app. Raw URLs are not shown in the holder preview.
        </span>
        <select
          value={callbackIndex}
          onChange={(event) => setCallbackIndex(Number(event.target.value))}
          style={input}
          disabled={!view?.callback_options.length}
        >
          {(view?.callback_options ?? []).map((option) => (
            <option key={option.index} value={option.index}>{option.label}</option>
          ))}
        </select>
      </label>

      <fieldset style={{ border: 0, margin: "0 0 0.85rem", padding: 0 }}>
        <legend style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
          Optional capabilities already on this sandbox app
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {(view?.enabled_capabilities ?? []).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={capabilities.includes(id)}
              onClick={() => toggleCap(id)}
              style={{
                padding: "0.4rem 0.7rem",
                borderRadius: 999,
                border: capabilities.includes(id) ? "1px solid rgba(99,102,241,0.55)" : "1px solid var(--border)",
                background: capabilities.includes(id) ? "rgba(99,102,241,0.14)" : "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {id.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </fieldset>

      <p style={{ ...body, marginBottom: "0.55rem" }}>
        Policy pack and version are pinned on the sandbox app ({view?.policy_template_id ?? "—"} · v{view?.policy_version ?? "—"}). They cannot be edited here.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <Btn size="sm" loading={busy} disabled={busy} onClick={() => void save()}>Save request configuration</Btn>
        {onContinue && (
          <Btn size="sm" variant="secondary" onClick={onContinue}>Continue to test console</Btn>
        )}
      </div>

      {view?.preview && (
        <>
          <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: "0 0 0.45rem" }}>
            Holder request preview
          </h3>
          <HolderRequestBriefCard brief={view.preview} />
        </>
      )}

      {view?.next_steps.length ? (
        <div style={{ marginBottom: "0.85rem" }}>
          <p role="status" style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            Next steps
          </p>
          <ul style={{ ...body, paddingLeft: "1.1rem" }}>
            {view.next_steps.map((step) => (
              <li key={step.id}>
                <Link href={step.href} style={{ color: "var(--accent)", fontWeight: 700 }}>{step.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view?.sandbox_start_link && (
        <Btn
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(view.sandbox_start_link!).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            });
          }}
        >
          {copied ? "Sandbox start link copied" : "Copy sandbox start link"}
        </Btn>
      )}
    </ContentCard>
  );
}
