"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  ACCOUNT_PARTNER_RECOVERY_ADMIN_NOTE,
  ACCOUNT_PARTNER_RECOVERY_API_KEY_FALLBACK,
  ACCOUNT_PARTNER_RECOVERY_REQUEST_BODY,
  ACCOUNT_PARTNER_RECOVERY_REQUEST_TITLE,
} from "@/lib/account/accountHubCopy";
import {
  fetchPartnerMembershipRecoveryPreview,
  requestPartnerMembershipRecoveryAttestation,
} from "@/lib/partner/launchpad/partnerMembershipRecoveryClient";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function PartnerMembershipRecoveryPanel({
  nativeAccountSignedIn,
  defaultApplicationId,
  defaultPartnerId,
  onMembershipLinked,
}: {
  nativeAccountSignedIn: boolean;
  defaultApplicationId?: string;
  defaultPartnerId?: string;
  onMembershipLinked?: () => void;
}) {
  const [applicationId, setApplicationId] = useState(defaultApplicationId ?? "");
  const [partnerId, setPartnerId] = useState(defaultPartnerId ?? "");
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attestationId, setAttestationId] = useState<string | null>(null);
  const [attestationExpires, setAttestationExpires] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const attestationTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (defaultApplicationId) setApplicationId(defaultApplicationId);
    if (defaultPartnerId) setPartnerId(defaultPartnerId);
  }, [defaultApplicationId, defaultPartnerId]);

  const runPreview = useCallback(async () => {
    if (!nativeAccountSignedIn) return;
    const app = applicationId.trim();
    const partner = partnerId.trim();
    if (!app || !partner) {
      setPreviewText(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const preview = await fetchPartnerMembershipRecoveryPreview({
        applicationId: app,
        partnerId: partner,
      });
      if (!preview.ok) {
        setPreviewText(null);
        setError(preview.error);
        return;
      }
      if (preview.membership_status === "already_linked") {
        setPreviewText("This account is already linked to that partner. Use Resume Launchpad with account.");
        onMembershipLinked?.();
        return;
      }
      const ent = preview.entitlement as { kind?: string; basis?: string };
      if (ent.kind === "admin_review_required") {
        setPreviewText(
          "Platform administrator review is required before membership can be granted. Requesting access creates a short-lived attestation for admin verification — it does not grant Launchpad by itself.",
        );
      } else if (ent.kind === "entitlement_conflict") {
        setPreviewText(
          "This application is already bound to a different Abraxas account. Contact support — automatic recovery is blocked.",
        );
      } else if (ent.kind === "server_verified_enrollment") {
        setPreviewText(
          "Server-verified sandbox enrollment matches this account. An administrator can complete the invitation grant after you submit a recovery attestation.",
        );
      } else {
        setPreviewText("Recovery preview ready. Submit a request when you are ready.");
      }
    } finally {
      setBusy(false);
    }
  }, [applicationId, nativeAccountSignedIn, onMembershipLinked, partnerId]);

  useEffect(() => {
    void runPreview();
  }, [runPreview]);

  async function submitRecoveryRequest() {
    setBusy(true);
    setError("");
    setStatusText("");
    setAttestationId(null);
    setAttestationExpires(null);
    setCopyNotice("");
    try {
      const result = await requestPartnerMembershipRecoveryAttestation({
        applicationId,
        partnerId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAttestationId(result.attestation_id);
      setAttestationExpires(result.expires_at);
      attestationTokenRef.current = result.recovery_attestation;
      setStatusText(
        `Recovery request recorded for account ${result.account_id}. Valid until ${new Date(result.expires_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" })}.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyAttestationForAdmin() {
    setCopyNotice("");
    const token = attestationTokenRef.current;
    if (!token) {
      setCopyNotice("Submit a recovery request first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(token);
      setCopyNotice("Attestation copied for your administrator. Do not share it in public channels.");
    } catch {
      setCopyNotice("Could not copy automatically. Use Admin → Partners → Account recovery while signed in as admin.");
    }
  }

  if (!nativeAccountSignedIn) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
        Sign in with your Abraxas account to request authorized access to an existing application.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {ACCOUNT_PARTNER_RECOVERY_REQUEST_TITLE}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0.25rem 0 0" }}>
          {ACCOUNT_PARTNER_RECOVERY_REQUEST_BODY}
        </p>
      </div>
      <label style={{ display: "grid", gap: "0.3rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700 }}>
        Application ID
        <input
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
          style={inputStyle}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <label style={{ display: "grid", gap: "0.3rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700 }}>
        Partner ID
        <input
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          style={inputStyle}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      {previewText ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
          {previewText}
        </p>
      ) : null}
      {error ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn size="sm" disabled={busy || !applicationId.trim() || !partnerId.trim()} onClick={() => void submitRecoveryRequest()}>
          Request authorized access
        </Btn>
        <Btn size="sm" variant="secondary" disabled={busy || !attestationId} onClick={() => void copyAttestationForAdmin()}>
          Copy attestation for administrator
        </Btn>
      </div>
      {statusText ? (
        <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
          {statusText}
          {attestationId ? ` Attestation ID: ${attestationId}.` : ""}
        </p>
      ) : null}
      {copyNotice ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0 }}>{copyNotice}</p>
      ) : null}
      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        {ACCOUNT_PARTNER_RECOVERY_ADMIN_NOTE}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        {ACCOUNT_PARTNER_RECOVERY_API_KEY_FALLBACK}
      </p>
    </div>
  );
}

const inputStyle = {
  fontFamily: ABRAXAS_FONT_MONO,
  fontSize: "0.72rem",
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
};
