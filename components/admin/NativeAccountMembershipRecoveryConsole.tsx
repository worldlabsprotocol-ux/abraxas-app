"use client";
// FILE: components/admin/NativeAccountMembershipRecoveryConsole.tsx
// Admin workflow for PR #796 partner membership recovery (attestation → ownership → invite).

import { useCallback, useRef, useState } from "react";
import type { ProductionAdminRequest } from "@/lib/admin/productionAdminSessionUi";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

export function NativeAccountMembershipRecoveryConsole({
  adminRequest,
}: {
  adminRequest: ProductionAdminRequest;
}) {
  const [recoveryAttestation, setRecoveryAttestation] = useState("");
  const [ownershipReason, setOwnershipReason] = useState("");
  const [ownershipEvidenceRef, setOwnershipEvidenceRef] = useState("");
  const adminOwnershipApprovalRef = useRef("");
  const [accountId, setAccountId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [grantReason, setGrantReason] = useState(
    "Founder recovery attestation verified; link existing sandbox Launchpad app.",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const jsonHeaders = useCallback((): HeadersInit => ({ "Content-Type": "application/json" }), []);

  async function runOwnershipReview() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await adminRequest("/api/admin/native-accounts/partner-membership-recovery-ownership-approval", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          recovery_attestation: recoveryAttestation.trim(),
          ownership_review_reason: ownershipReason.trim(),
          ownership_evidence_ref: ownershipEvidenceRef.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        account_id?: string;
        partner_id?: string;
        application_id?: string;
        admin_ownership_approval?: string;
        entitlement?: { kind?: string };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Ownership review failed");
      }
      setAccountId(data.account_id ?? "");
      setPartnerId(data.partner_id ?? "");
      setApplicationId(data.application_id ?? "");
      adminOwnershipApprovalRef.current = data.admin_ownership_approval ?? "";
      setNotice(
        `Ownership review recorded (${data.entitlement?.kind ?? "review"}). Continue with invitation grant when ready.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ownership review failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyInvitationGrant() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const approval = adminOwnershipApprovalRef.current.trim();
      const res = await adminRequest("/api/admin/native-accounts/partner-membership-invite", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          account_id: accountId.trim(),
          partner_id: partnerId.trim(),
          application_id: applicationId.trim(),
          reason: grantReason.trim(),
          recovery_attestation: recoveryAttestation.trim(),
          admin_ownership_approval: approval || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; already_member?: boolean };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Invitation grant failed");
      }
      adminOwnershipApprovalRef.current = "";
      setNotice(data.already_member ? "Account was already a member — session can resume." : "Membership grant applied.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invitation grant failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
        Complete authorized recovery for an existing sandbox Launchpad application. Paste the founder recovery attestation
        from a secure channel. Never grant membership without verifying entitlement to the application.
      </p>
      <label style={labelStyle}>
        Recovery attestation (JWT from founder)
        <textarea
          value={recoveryAttestation}
          onChange={(e) => setRecoveryAttestation(e.target.value)}
          rows={3}
          style={textAreaStyle}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <label style={labelStyle}>
        Ownership review reason (audit narrative)
        <textarea
          value={ownershipReason}
          onChange={(e) => setOwnershipReason(e.target.value)}
          rows={2}
          style={textAreaStyle}
        />
      </label>
      <label style={labelStyle}>
        Ownership evidence ref (application UUID or provisioning activity id)
        <input
          value={ownershipEvidenceRef}
          onChange={(e) => setOwnershipEvidenceRef(e.target.value)}
          style={inputStyle}
        />
      </label>
      <button
        type="button"
        disabled={busy || !recoveryAttestation.trim()}
        onClick={() => void runOwnershipReview()}
        style={primaryBtn}
      >
        1. Record ownership review
      </button>
      <label style={labelStyle}>
        Account ID (filled after review when available)
        <input value={accountId} onChange={(e) => setAccountId(e.target.value)} style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Partner ID
        <input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Application ID
        <input value={applicationId} onChange={(e) => setApplicationId(e.target.value)} style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Grant reason
        <input value={grantReason} onChange={(e) => setGrantReason(e.target.value)} style={inputStyle} />
      </label>
      <button
        type="button"
        disabled={busy || !recoveryAttestation.trim() || !accountId.trim() || !partnerId.trim() || !applicationId.trim()}
        onClick={() => void applyInvitationGrant()}
        style={primaryBtn}
      >
        2. Apply invitation grant
      </button>
      {error ? <p style={{ color: "#f87171", fontFamily: FONT, fontSize: "0.78rem", margin: 0 }}>{error}</p> : null}
      {notice ? <p style={{ color: ACCENT, fontFamily: FONT, fontSize: "0.78rem", margin: 0 }}>{notice}</p> : null}
    </div>
  );
}

const labelStyle = {
  display: "grid",
  gap: "0.35rem",
  fontFamily: FONT,
  fontSize: "0.72rem",
  fontWeight: 700,
};

const inputStyle = {
  fontFamily: MONO,
  fontSize: "0.72rem",
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f1419",
  color: "#f0f0f0",
};

const textAreaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};

const primaryBtn = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  fontWeight: 700,
  padding: "0.55rem 0.85rem",
  borderRadius: 8,
  border: "none",
  background: ACCENT,
  color: "#0a0c10",
  cursor: "pointer",
  width: "fit-content",
};
