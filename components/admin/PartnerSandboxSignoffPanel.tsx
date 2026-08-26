"use client";
// FILE: components/admin/PartnerSandboxSignoffPanel.tsx
// Operator sandbox pilot sign-off checklist for promoted design partners.

import { useCallback, useEffect, useState } from "react";
import type { PartnerSandboxPilotSignoff } from "@/lib/admin/partnerSandboxSignoff";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const WARN = "#F59E0B";
const ACCENT = "#10B981";

type AdminRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface PartnerSandboxSignoffPanelProps {
  partnerId: string;
  applicationId: string;
  adminRequest: AdminRequest;
  usePinUnlock: boolean;
  onUnauthorized?: () => void;
}

export function PartnerSandboxSignoffPanel({
  partnerId,
  applicationId,
  adminRequest,
  usePinUnlock,
  onUnauthorized,
}: PartnerSandboxSignoffPanelProps) {
  const [signoff, setSignoff] = useState<PartnerSandboxPilotSignoff | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [eventId, setEventId] = useState("");
  const [signoffMessage, setSignoffMessage] = useState("");
  const [signoffError, setSignoffError] = useState("");
  const [notesMessage, setNotesMessage] = useState("");
  const [notesError, setNotesError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setSignoffError("");
    const res = await adminRequest(
      `/api/admin/partners/sandbox-signoff?partner_id=${encodeURIComponent(partnerId)}`,
      { cache: "no-store" },
    );
    if (res.status === 401 && !usePinUnlock) {
      onUnauthorized?.();
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setSignoffError("Could not load sandbox sign-off");
      setLoading(false);
      return;
    }
    const data = await res.json() as {
      signoff: PartnerSandboxPilotSignoff;
      reviewer_notes: string | null;
    };
    setSignoff(data.signoff);
    setReviewerNotes(data.reviewer_notes ?? "");
    setPolicyId(data.signoff.evidence.policy_id ?? "");
    setReceiptId(data.signoff.evidence.receipt_id ?? "");
    setEventId(data.signoff.evidence.event_id ?? "");
    setLoading(false);
  }, [adminRequest, onUnauthorized, partnerId, usePinUnlock]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSignoff() {
    if (!signoff) return;
    setSignoffMessage("");
    setSignoffError("");
    const res = await adminRequest("/api/admin/partners/sandbox-signoff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_id: partnerId,
        gates: signoff.gates,
        evidence: {
          ...(policyId.trim() ? { policy_id: policyId.trim() } : {}),
          ...(receiptId.trim() ? { receipt_id: receiptId.trim() } : {}),
          ...(eventId.trim() ? { event_id: eventId.trim() } : {}),
        },
      }),
    });
    if (res.status === 401 && !usePinUnlock) {
      onUnauthorized?.();
      return;
    }
    if (res.status === 409) {
      setSignoffError("Another update occurred — refresh and retry.");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setSignoffError(data.error ?? "Sign-off save failed");
      return;
    }
    const data = await res.json() as { signoff: PartnerSandboxPilotSignoff };
    setSignoff(data.signoff);
    setSignoffMessage("Sandbox sign-off saved.");
  }

  async function saveNotes() {
    setNotesMessage("");
    setNotesError("");
    const res = await adminRequest("/api/admin/design-partners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: applicationId,
        status: "onboarded",
        reviewer_notes: reviewerNotes,
      }),
    });
    if (res.status === 401 && !usePinUnlock) {
      onUnauthorized?.();
      return;
    }
    if (!res.ok) {
      setNotesError("Reviewer notes save failed");
      return;
    }
    setNotesMessage("Reviewer notes saved.");
  }

  function toggleGate(
    gateKey: keyof PartnerSandboxPilotSignoff["gates"],
    field: "operator_ack" | "manual_partner_confirmation",
  ) {
    if (!signoff || gateKey === "webhook_track") return;
    const prior = signoff.gates[gateKey];
    const nextValue = field === "operator_ack" ? !prior.operator_ack : !prior.manual_partner_confirmation;
    setSignoff({
      ...signoff,
      gates: {
        ...signoff.gates,
        [gateKey]: {
          ...prior,
          [field]: nextValue,
          ...(field === "operator_ack" && !nextValue ? { manual_partner_confirmation: false } : {}),
        },
      },
    });
  }

  if (loading) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: 0 }}>
        Loading sandbox sign-off…
      </p>
    );
  }

  if (!signoff) {
    return (
      <p role="alert" style={{ fontFamily: FONT, fontSize: "0.76rem", color: WARN, margin: 0 }}>
        {signoffError || "Sandbox sign-off unavailable."}
      </p>
    );
  }

  return (
    <section
      aria-label="Sandbox pilot sign-off"
      data-testid="partner-sandbox-signoff-panel"
      style={{ display: "grid", gap: "0.65rem" }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: WARN, margin: 0, fontWeight: 600, lineHeight: 1.55 }}>
        Sandbox completion does not grant Production access. Delivered ≠ signature verified. Receipt existence ≠ partner validated.
      </p>

      <div style={{ display: "grid", gap: "0.45rem" }}>
        {([
          ["configured", "Configured (partner row, policy, allowlist)"],
          ["partner_flow_tested", "Partner Flow tested (manual)"],
          ["partner_verified", "Partner verified (manual partner confirmation)"],
          ["approved_for_pilot_continuation", "Approved for pilot continuation"],
        ] as const).map(([key, label]) => (
          <label
            key={key}
            style={{ fontFamily: FONT, fontSize: "0.76rem", display: "flex", gap: "0.5rem", alignItems: "flex-start", lineHeight: 1.5 }}
          >
            <input
              type="checkbox"
              checked={signoff.gates[key].operator_ack}
              onChange={() => toggleGate(key, "operator_ack")}
              data-testid={`gate-${key}`}
            />
            <span>{label}</span>
          </label>
        ))}

        <label style={{ fontFamily: FONT, fontSize: "0.76rem", display: "flex", gap: "0.5rem", alignItems: "flex-start", marginLeft: "1.25rem" }}>
          <input
            type="checkbox"
            checked={Boolean(signoff.gates.partner_verified.manual_partner_confirmation)}
            onChange={() => toggleGate("partner_verified", "manual_partner_confirmation")}
            data-testid="gate-partner-verified-manual"
          />
          <span>Manual partner confirmation (partner_verified)</span>
        </label>
      </div>

      <div style={{ display: "grid", gap: "0.45rem" }}>
        <label style={{ fontFamily: FONT, fontSize: "0.72rem" }}>
          <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>policy_id (evidence)</span>
          <input
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            data-testid="evidence-policy-id"
            style={inputStyle}
          />
        </label>
        <label style={{ fontFamily: FONT, fontSize: "0.72rem" }}>
          <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>receipt_id (optional)</span>
          <input
            value={receiptId}
            onChange={(e) => setReceiptId(e.target.value)}
            data-testid="evidence-receipt-id"
            style={{ ...inputStyle, fontFamily: MONO, wordBreak: "break-all" }}
          />
        </label>
        <label style={{ fontFamily: FONT, fontSize: "0.72rem" }}>
          <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>event_id (optional webhook)</span>
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            data-testid="evidence-event-id"
            style={{ ...inputStyle, fontFamily: MONO, wordBreak: "break-all" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" onClick={() => void saveSignoff()} data-testid="save-signoff" style={btnStyle}>
          Save sign-off
        </button>
        {signoffMessage && (
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT }}>{signoffMessage}</span>
        )}
        {signoffError && (
          <span role="alert" style={{ fontFamily: FONT, fontSize: "0.72rem", color: WARN }}>{signoffError}</span>
        )}
      </div>

      <label style={{ fontFamily: FONT, fontSize: "0.72rem" }}>
        <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>Reviewer notes (freeform)</span>
        <textarea
          value={reviewerNotes}
          onChange={(e) => setReviewerNotes(e.target.value)}
          data-testid="reviewer-notes"
          rows={3}
          style={{ ...inputStyle, width: "100%", resize: "vertical", minHeight: 72 }}
        />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" onClick={() => void saveNotes()} data-testid="save-notes" style={secondaryBtnStyle}>
          Save notes
        </button>
        {notesMessage && (
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT }}>{notesMessage}</span>
        )}
        {notesError && (
          <span role="alert" style={{ fontFamily: FONT, fontSize: "0.72rem", color: WARN }}>{notesError}</span>
        )}
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.7rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: "16px",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "#1a1408",
  fontFamily: FONT,
  fontWeight: 700,
  cursor: "pointer",
  minHeight: 44,
};

const secondaryBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: "transparent",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
};
