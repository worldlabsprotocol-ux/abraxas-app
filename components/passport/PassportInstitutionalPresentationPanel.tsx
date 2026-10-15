"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { PassportReusableCredentialSummary } from "@/lib/passport/reusableCredential/contract";
import {
  signPassportPossessionChallenge,
  type PassportPossessionChallengePayload,
} from "@/lib/passport/reusableCredential/holderPossessionChallengeSigning";

const FONT = ABRAXAS_FONT_SANS;

type CatalogEntry = {
  partner_id: string;
  partner_display_name: string;
  policy_id: string;
  requested_attribute: string;
  purpose: string;
  disclosure_summary: string[];
  issuer_id: string;
};

function b64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function PassportInstitutionalPresentationPanel({
  sessionReady,
  credentials,
}: {
  sessionReady: boolean;
  credentials: PassportReusableCredentialSummary[];
}) {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [consentOpen, setConsentOpen] = useState(false);
  const [credentialId, setCredentialId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    const res = await fetch("/api/passport/reusable-credentials/institutional-catalog", {
      credentials: "include",
    });
    const data = (await res.json()) as { catalog?: CatalogEntry[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "catalog_failed");
    setCatalog(data.catalog ?? []);
    if (data.catalog?.[0]) setSelectedPartner(data.catalog[0].partner_id);
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    void loadCatalog().catch(() => setCatalog([]));
  }, [sessionReady, loadCatalog]);

  useEffect(() => {
    if (credentials[0]?.credential_id) setCredentialId(credentials[0].credential_id);
  }, [credentials]);

  const entry = catalog.find((c) => c.partner_id === selectedPartner) ?? null;

  async function approvePresentation() {
    if (!entry || !credentialId) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const secretB64 = sessionStorage.getItem("abraxas_passport_possession_secret");
      if (!secretB64) {
        throw new Error(
          "This browser session does not have your device possession key. Register the key again on this device, or use wallet key recovery if configured.",
        );
      }
      const nacl = await import("tweetnacl");
      const secretKey = b64UrlToBytes(secretB64);

      const consentRes = await fetch("/api/passport/reusable-credentials/institutional-consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: entry.partner_id,
          policy_id: entry.policy_id,
          credential_id: credentialId,
        }),
      });
      const consentBody = (await consentRes.json()) as { consent_id?: string; error?: string };
      if (!consentRes.ok || !consentBody.consent_id) {
        throw new Error(consentBody.error ?? "consent_failed");
      }

      const challengeRes = await fetch("/api/passport/reusable-credentials/challenge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: entry.partner_id,
          policy_id: entry.policy_id,
          credential_id: credentialId,
        }),
      });
      const challengeBody = (await challengeRes.json()) as {
        challenge?: { challenge_id: string; credential_id: string; partner_id: string; policy_id: string; nonce: string; issued_at: string; expires_at: string; v: number; purpose: string };
        error?: string;
        issuer_backed?: boolean;
      };
      if (!challengeRes.ok || !challengeBody.challenge) {
        throw new Error(challengeBody.error ?? "challenge_failed");
      }
      const challenge = challengeBody.challenge as PassportPossessionChallengePayload;
      const proof = {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, secretKey),
      };

      const presentRes = await fetch("/api/passport/reusable-credentials/present", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: entry.partner_id,
          policy_id: entry.policy_id,
          credential_id: credentialId,
          consent_id: consentBody.consent_id,
          challenge,
          holder_possession_proof: proof,
          request_id: `passport_ui_${Date.now()}`,
        }),
      });
      const presentBody = (await presentRes.json()) as {
        error?: string;
        partner_authorization?: { receipt_id?: string };
      };
      if (!presentRes.ok) throw new Error(presentBody.error ?? "present_failed");
      setResult(
        presentBody.partner_authorization?.receipt_id
          ? `Authorization complete. Receipt ${presentBody.partner_authorization.receipt_id}`
          : "Authorization complete.",
      );
      setConsentOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Presentation failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!sessionReady || credentials.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.5rem" }}>
      <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: 0 }}>
        Institutional verification requests
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
        Review each request before signing. Your possession key stays on this device. Abraxas never receives your private key.
      </p>
      <label style={{ fontFamily: FONT, fontSize: "0.72rem", display: "grid", gap: "0.25rem" }}>
        Institution (server configured)
        <select
          value={selectedPartner}
          onChange={(e) => setSelectedPartner(e.target.value)}
          style={{ fontFamily: FONT, fontSize: "0.78rem", padding: "0.35rem" }}
        >
          {catalog.map((c) => (
            <option key={c.partner_id} value={c.partner_id}>
              {c.partner_display_name}
            </option>
          ))}
        </select>
      </label>
      {entry ? (
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          <div>Requested attribute: {entry.requested_attribute}</div>
          <div>Purpose: {entry.purpose}</div>
          <div>Issuer: {entry.issuer_id}</div>
          <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
            {entry.disclosure_summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {!consentOpen ? (
        <Btn variant="primary" disabled={!entry || busy} onClick={() => setConsentOpen(true)}>
          Review and approve
        </Btn>
      ) : (
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: 0, color: "var(--text-secondary)" }}>
            You are approving disclosure of policy-scoped eligibility to {entry?.partner_display_name}. This signs a fresh
            audience-bound challenge with your device possession key.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Btn variant="primary" disabled={busy} onClick={() => void approvePresentation()}>
              {busy ? "Signing…" : "Confirm and sign"}
            </Btn>
            <Btn variant="secondary" disabled={busy} onClick={() => setConsentOpen(false)}>
              Deny
            </Btn>
          </div>
        </div>
      )}
      {result ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--accent)", margin: 0 }}>{result}</p>
      ) : null}
      {error ? (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
