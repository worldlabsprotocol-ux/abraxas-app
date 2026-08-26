"use client";
// FILE: components/admin/PartnerSandboxSignoffPanel.tsx
// Operator sandbox pilot sign-off checklist for promoted design partners.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  anyWebhookGateAcknowledged,
  defaultWebhookTrackGates,
  WEBHOOK_EVENT_CHANGE_REQUIRES_GATE_RESET_MESSAGE,
  webhookEventIdChangeBlocked,
  type PartnerSandboxPilotSignoff,
  type WebhookTrackGates,
} from "@/lib/admin/partnerSandboxSignoff";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const WARN = "#F59E0B";
const ACCENT = "#10B981";

type AdminRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type MainGateKey = "configured" | "partner_flow_tested" | "partner_verified" | "approved_for_pilot_continuation";
type WebhookGateKey = keyof WebhookTrackGates;

interface PartnerSandboxSignoffPanelProps {
  partnerId: string;
  applicationId: string;
  adminRequest: AdminRequest;
  usePinUnlock: boolean;
  onUnauthorized?: () => void;
}

function ensureWebhookTrack(signoff: PartnerSandboxPilotSignoff): PartnerSandboxPilotSignoff {
  if (signoff.gates.webhook_track) return signoff;
  return {
    ...signoff,
    gates: {
      ...signoff.gates,
      webhook_track: defaultWebhookTrackGates(),
    },
  };
}

function cascadeWebhookUncheck(
  webhook: WebhookTrackGates,
  gateKey: WebhookGateKey,
  field: "operator_ack" | "manual_partner_confirmation",
  nextValue: boolean,
): WebhookTrackGates {
  if (field !== "operator_ack" || nextValue) {
    return {
      ...webhook,
      [gateKey]: {
        ...webhook[gateKey],
        [field]: nextValue,
        ...(field === "operator_ack" && !nextValue ? { manual_partner_confirmation: false } : {}),
      },
    };
  }

  if (gateKey === "queued") {
    return {
      queued: { operator_ack: false, acknowledged_at: null },
      http_delivered: { operator_ack: false, acknowledged_at: null },
      signature_verified_by_receiver: { operator_ack: false, acknowledged_at: null },
    };
  }

  if (gateKey === "http_delivered") {
    return {
      ...webhook,
      http_delivered: { operator_ack: false, acknowledged_at: null },
      signature_verified_by_receiver: { operator_ack: false, acknowledged_at: null },
    };
  }

  return {
    ...webhook,
    signature_verified_by_receiver: {
      ...webhook.signature_verified_by_receiver,
      operator_ack: false,
      manual_partner_confirmation: false,
      acknowledged_at: null,
    },
  };
}

export function PartnerSandboxSignoffPanel({
  partnerId,
  applicationId,
  adminRequest,
  usePinUnlock,
  onUnauthorized,
}: PartnerSandboxSignoffPanelProps) {
  const [signoff, setSignoff] = useState<PartnerSandboxPilotSignoff | null>(null);
  const [savedEventId, setSavedEventId] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [eventId, setEventId] = useState("");
  const [signoffMessage, setSignoffMessage] = useState("");
  const [signoffError, setSignoffError] = useState("");
  const [eventIdError, setEventIdError] = useState("");
  const [notesMessage, setNotesMessage] = useState("");
  const [notesError, setNotesError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setSignoffError("");
    setEventIdError("");
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
    const loadedEvent = data.signoff.evidence.event_id ?? "";
    setEventId(loadedEvent);
    setSavedEventId(loadedEvent);
    setLoading(false);
  }, [adminRequest, onUnauthorized, partnerId, usePinUnlock]);

  useEffect(() => {
    void load();
  }, [load]);

  const eventIdChangeBlocked = signoff
    ? webhookEventIdChangeBlocked(signoff, savedEventId, eventId)
    : false;

  function handleEventIdChange(value: string) {
    setEventId(value);
    if (signoff && webhookEventIdChangeBlocked(signoff, savedEventId, value)) {
      setEventIdError(WEBHOOK_EVENT_CHANGE_REQUIRES_GATE_RESET_MESSAGE);
    } else {
      setEventIdError("");
    }
  }

  async function saveSignoff() {
    if (!signoff) return;
    if (eventIdChangeBlocked) {
      setSignoffError(WEBHOOK_EVENT_CHANGE_REQUIRES_GATE_RESET_MESSAGE);
      return;
    }
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
      const message = data.error === "webhook_event_change_requires_gate_reset"
        ? WEBHOOK_EVENT_CHANGE_REQUIRES_GATE_RESET_MESSAGE
        : (data.error ?? "Sign-off save failed");
      setSignoffError(message);
      return;
    }
    const data = await res.json() as { signoff: PartnerSandboxPilotSignoff };
    setSignoff(data.signoff);
    const nextEvent = data.signoff.evidence.event_id ?? "";
    setEventId(nextEvent);
    setSavedEventId(nextEvent);
    setEventIdError("");
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
    gateKey: MainGateKey,
    field: "operator_ack" | "manual_partner_confirmation",
  ) {
    if (!signoff) return;
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

  function toggleWebhookGate(
    gateKey: WebhookGateKey,
    field: "operator_ack" | "manual_partner_confirmation",
  ) {
    if (!signoff) return;
    const withTrack = ensureWebhookTrack(signoff);
    const webhook = withTrack.gates.webhook_track!;
    const prior = webhook[gateKey];
    const nextValue = field === "operator_ack" ? !prior.operator_ack : !prior.manual_partner_confirmation;
    const nextWebhook = cascadeWebhookUncheck(webhook, gateKey, field, nextValue);
    const nextGate = {
      ...nextWebhook[gateKey],
      [field]: nextValue,
      ...(field === "operator_ack" && !nextValue ? { manual_partner_confirmation: false } : {}),
    };
    setSignoff({
      ...withTrack,
      gates: {
        ...withTrack.gates,
        webhook_track: {
          ...nextWebhook,
          [gateKey]: nextGate,
        },
      },
    });
    if (eventIdChangeBlocked) {
      setEventIdError(WEBHOOK_EVENT_CHANGE_REQUIRES_GATE_RESET_MESSAGE);
    }
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

  const webhookTrack = signoff.gates.webhook_track;
  const observabilityHref = "/admin/partners?tab=observability";
  const sandboxReceiptsHref = "/admin/partners?tab=sandbox-receipts";

  return (
    <section
      aria-label="Sandbox pilot sign-off"
      data-testid="partner-sandbox-signoff-panel"
      style={{ display: "grid", gap: "0.65rem", maxWidth: "100%", overflowX: "hidden" }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: WARN, margin: 0, fontWeight: 600, lineHeight: 1.55 }}>
        Sandbox completion does not grant Production access. Delivered ≠ signature verified. Receipt existence ≠ partner validated.
      </p>

      <div data-testid="partner-flow-signoff-section" style={{ display: "grid", gap: "0.45rem" }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          Partner Flow track
        </h3>
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
      </div>

      <div
        data-testid="webhook-track-signoff-section"
        style={{
          display: "grid",
          gap: "0.45rem",
          paddingTop: "0.45rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        <h3 style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          Optional webhook track
        </h3>
        <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
          Optional. Does not count toward the four main gates or Production activation. Queued ≠ delivered.
          Delivery history and sandbox receipts are informational only — they never auto-check these gates.
        </p>

        <label style={{ fontFamily: FONT, fontSize: "0.76rem", display: "flex", gap: "0.5rem", alignItems: "flex-start", lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={Boolean(webhookTrack?.queued.operator_ack)}
            onChange={() => toggleWebhookGate("queued", "operator_ack")}
            data-testid="gate-webhook-queued"
          />
          <span>Test event queued (manual)</span>
        </label>
        <label style={{ fontFamily: FONT, fontSize: "0.76rem", display: "flex", gap: "0.5rem", alignItems: "flex-start", lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={Boolean(webhookTrack?.http_delivered.operator_ack)}
            onChange={() => toggleWebhookGate("http_delivered", "operator_ack")}
            data-testid="gate-webhook-http-delivered"
          />
          <span>HTTP delivered (manual)</span>
        </label>
        <label style={{ fontFamily: FONT, fontSize: "0.76rem", display: "flex", gap: "0.5rem", alignItems: "flex-start", lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={Boolean(webhookTrack?.signature_verified_by_receiver.operator_ack)}
            onChange={() => toggleWebhookGate("signature_verified_by_receiver", "operator_ack")}
            data-testid="gate-webhook-signature-verified"
          />
          <span>Signature verified by receiver (manual)</span>
        </label>
        <label style={{ fontFamily: FONT, fontSize: "0.76rem", display: "flex", gap: "0.5rem", alignItems: "flex-start", marginLeft: "1.25rem", lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={Boolean(webhookTrack?.signature_verified_by_receiver.manual_partner_confirmation)}
            onChange={() => toggleWebhookGate("signature_verified_by_receiver", "manual_partner_confirmation")}
            data-testid="gate-webhook-signature-manual"
          />
          <span>Manual partner confirmation (signature verified)</span>
        </label>

        <label style={{ fontFamily: FONT, fontSize: "0.72rem" }}>
          <span style={{ display: "block", fontWeight: 700, marginBottom: "0.25rem" }}>event_id (webhook evidence)</span>
          <input
            value={eventId}
            onChange={(e) => handleEventIdChange(e.target.value)}
            data-testid="evidence-event-id"
            style={{ ...inputStyle, fontFamily: MONO, wordBreak: "break-all" }}
          />
          {eventIdError && (
            <span role="alert" data-testid="event-id-blocked-message" style={{ display: "block", marginTop: "0.35rem", fontSize: "0.68rem", color: WARN }}>
              {eventIdError}
            </span>
          )}
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          <Link href={observabilityHref} data-testid="link-webhook-observability" style={linkStyle}>
            Delivery observability
          </Link>
          <Link href={sandboxReceiptsHref} data-testid="link-webhook-sandbox-receipts" style={linkStyle}>
            Sandbox test receipts
          </Link>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          Enter partner ID <code style={{ fontFamily: MONO, fontSize: "0.62rem" }}>{partnerId}</code> on those pages and click Load — partner ID is not prefilled.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => void saveSignoff()}
          disabled={eventIdChangeBlocked}
          data-testid="save-signoff"
          style={{
            ...btnStyle,
            opacity: eventIdChangeBlocked ? 0.55 : 1,
            cursor: eventIdChangeBlocked ? "not-allowed" : "pointer",
          }}
        >
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

const linkStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.72rem",
  color: ACCENT,
  fontWeight: 700,
  textDecoration: "none",
  padding: "0.35rem 0.65rem",
  borderRadius: 8,
  border: `1px solid ${ACCENT}44`,
};
