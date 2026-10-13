"use client";

import { useState } from "react";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

const STAGES = [
  { id: 1, label: "Application submitted", evidence: ["Request JSON", "Partner profile"] },
  { id: 2, label: "Sandbox created", evidence: ["Sandbox app id", "Environment: sandbox"] },
  { id: 3, label: "Policy configured", evidence: ["Policy pack", "Privacy contract", "Webhook URL"] },
  { id: 4, label: "Holder flow tested", evidence: ["Handoff trace", "Session continuity"] },
  { id: 5, label: "Receipt issued", evidence: ["Receipt sample", "Signature check"] },
  { id: 6, label: "Verification succeeded", evidence: ["Verifier result", "Health status"] },
  { id: 7, label: "Production requested", evidence: ["Go-live request", "Review note"] },
  { id: 8, label: "Production approved", evidence: ["Operator decision", "Production credentials gate"] },
] as const;

const EVIDENCE_META: Record<string, { detail: string; status?: "ok" | "neutral" }> = {
  "Request JSON": { detail: "1.2 KB · logged", status: "neutral" },
  "Partner profile": { detail: "Sandbox tenant", status: "neutral" },
  "Sandbox app id": { detail: "Private slug", status: "ok" },
  "Environment: sandbox": { detail: "Not production", status: "ok" },
  "Policy pack": { detail: "Eligibility rules", status: "ok" },
  "Privacy contract": { detail: "Disclosure bounds", status: "ok" },
  "Webhook URL": { detail: "Delivery health", status: "ok" },
  "Handoff trace": { detail: "Browser + API", status: "neutral" },
  "Session continuity": { detail: "PKCE / return URL", status: "neutral" },
  "Receipt sample": { detail: "View sample", status: "ok" },
  "Signature check": { detail: "Ed25519 fixture", status: "ok" },
  "Verifier result": { detail: "Sandbox fixture only", status: "neutral" },
  "Health status": { detail: "See Launchpad health panels", status: "neutral" },
  "Go-live request": { detail: "Operator queue — not auto-approved", status: "neutral" },
  "Review note": { detail: "Human review required", status: "neutral" },
  "Operator decision": { detail: "Not self-serve mainnet", status: "neutral" },
  "Production credentials gate": { detail: "Issuance control plane", status: "neutral" },
};

export function PartnerLifecycleControlRoomVisual() {
  const [active, setActive] = useState(3);
  const stage = STAGES.find((s) => s.id === active) ?? STAGES[2];

  return (
    <ProtocolVisualShell
      id="partner-operations"
      title="Partner Operations"
      className="abx-pv-lifecycle abx-pv-shell--exhibit"
    >
      <div className="abx-pv-lifecycle__room">
        <div className="abx-pv-lifecycle__map" role="tablist" aria-label="Partner lifecycle stages">
          {STAGES.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`abx-pv-lifecycle__node${isActive ? " abx-pv-lifecycle__node--active" : ""}`}
                onClick={() => setActive(s.id)}
              >
                <span className="abx-pv-lifecycle__node-index">{String(s.id).padStart(2, "0")}</span>
                <span className="abx-pv-lifecycle__node-label">{s.label}</span>
              </button>
            );
          })}
        </div>
        <aside className="abx-pv-lifecycle__evidence" aria-live="polite">
          <p className="abx-pv-lifecycle__stage-meta">
            Stage {stage.id} of {STAGES.length}
          </p>
          <h3 className="abx-pv-lifecycle__stage-title">{stage.label}</h3>
          <p className="abx-pv-lifecycle__evidence-heading">Evidence</p>
          <ul className="abx-pv-lifecycle__evidence-list">
            {stage.evidence.map((item) => {
              const meta = EVIDENCE_META[item] ?? { detail: "Recorded in Launchpad", status: "neutral" as const };
              return (
                <li key={item} className="abx-pv-lifecycle__evidence-row">
                  <span className="abx-pv-lifecycle__evidence-name">{item}</span>
                  <span className={`abx-pv-lifecycle__evidence-status abx-pv-lifecycle__evidence-status--${meta.status}`}>
                    {meta.detail}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </ProtocolVisualShell>
  );
}
