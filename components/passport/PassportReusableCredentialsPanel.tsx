"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { PassportReusableCredentialSummary } from "@/lib/passport/reusableCredential/contract";
import type { ReusableCredentialLifecycleState } from "@/lib/passport/reusableCredential/credentialLifecycle";
import { PassportInstitutionalPresentationPanel } from "@/components/passport/PassportInstitutionalPresentationPanel";
import {
  isPossessionRememberDeviceEnabled,
  loadHolderPossessionKeyMaterial,
  setPossessionRememberDevice,
  storeHolderPossessionKeyMaterial,
} from "@/lib/passport/holderPossessionKeyBrowserStorage";
import { registerHolderPossessionKeyWithServer } from "@/lib/passport/registerHolderPossessionKeyClient";
import type { HolderIdentitySurfaceSnapshot } from "@/lib/passport/holderIdentityReconciliation";
import {
  isCanonicalMigrationVisibleSuccess,
  shouldDeferReusableCredentialActions,
  shouldShowCompleteVerificationPrompt,
  shouldSuppressRepeatVerificationNudge,
} from "@/lib/passport/holderIdentityUiCopy";

const FONT = ABRAXAS_FONT_SANS;

const STATE_LABEL: Record<ReusableCredentialLifecycleState, string> = {
  pending_verification: "Pending verification",
  awaiting_human_review: "Awaiting human review",
  approved_preparing_credential: "Approved and preparing credential",
  possession_key_required: "Possession key registration required",
  credential_issued: "Credential issued",
  credential_expired: "Credential expired",
  credential_revoked: "Credential revoked",
  issuance_unavailable: "Issuance unavailable",
};

export function PassportReusableCredentialsPanel({ sessionReady }: { sessionReady: boolean }) {
  const [credentials, setCredentials] = useState<PassportReusableCredentialSummary[]>([]);
  const [sandboxOnly, setSandboxOnly] = useState(true);
  const [issuerBacked, setIssuerBacked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [possessionNote, setPossessionNote] = useState<string | null>(null);
  const [lifecycleHeadline, setLifecycleHeadline] = useState<string | null>(null);
  const [lifecycleDetail, setLifecycleDetail] = useState<string | null>(null);
  const [lifecycleState, setLifecycleState] = useState<ReusableCredentialLifecycleState | null>(null);
  const [recoveryKind, setRecoveryKind] = useState<string | null>(null);
  const [rememberPossessionOnDevice, setRememberPossessionOnDevice] = useState(false);
  const [holderIdentity, setHolderIdentity] = useState<HolderIdentitySurfaceSnapshot | null>(null);

  useEffect(() => {
    setRememberPossessionOnDevice(isPossessionRememberDeviceEnabled());
    void loadHolderPossessionKeyMaterial().then((material) => {
      if (material?.source === "indexed_db") {
        setPossessionNote("Possession key restored from this device storage. Private key material did not leave your browser.");
      }
    });
  }, []);

  const loadLifecycle = useCallback(async () => {
    const res = await fetch("/api/passport/reusable-credentials/status", { credentials: "include" });
    const data = (await res.json()) as {
      lifecycle?: {
        state: ReusableCredentialLifecycleState;
        headline: string;
        detail: string;
        recovery?: { kind: string };
      };
      holder_identity?: HolderIdentitySurfaceSnapshot;
    };
    if (!res.ok || !data.lifecycle) return;
    setLifecycleState(data.lifecycle.state);
    setLifecycleHeadline(data.lifecycle.headline);
    setLifecycleDetail(data.lifecycle.detail);
    setRecoveryKind(data.lifecycle.recovery?.kind ?? null);
    setHolderIdentity(data.holder_identity ?? null);
  }, []);

  const load = useCallback(async () => {
    if (!sessionReady) return;
    setLoading(true);
    setError(null);
    try {
      await loadLifecycle();
      const res = await fetch("/api/passport/reusable-credentials", { credentials: "include" });
      const data = (await res.json()) as {
        credentials?: PassportReusableCredentialSummary[];
        sandbox_only?: boolean;
        issuer_backed?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "load_failed");
      setCredentials(data.credentials ?? []);
      setSandboxOnly(data.sandbox_only !== false);
      setIssuerBacked(Boolean(data.issuer_backed));
    } catch {
      setError("Reusable credentials are unavailable right now.");
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [sessionReady, loadLifecycle]);

  useEffect(() => {
    void load();
  }, [load]);

  async function registerPossessionKey(forceRotation = false) {
    setBusy("possession");
    setPossessionNote(null);
    try {
      const nacl = await import("tweetnacl");
      const existing = await loadHolderPossessionKeyMaterial();
      const existingSecret = existing?.secretKeyB64Url ?? null;
      const existingPublic = existing?.publicKeyB64Url ?? null;
      if (existingSecret && existingPublic && !forceRotation) {
        setPossessionNote(
          "This device already has a possession key. Use rotate only when you intend to replace the bound key.",
        );
        return;
      }
      const seed = crypto.getRandomValues(new Uint8Array(32));
      const pair = nacl.sign.keyPair.fromSeed(seed);
      const toB64Url = (bytes: Uint8Array) => {
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      };
      const publicKeyB64Url = toB64Url(pair.publicKey);
      const secretKeyB64Url = toB64Url(pair.secretKey);
      const registration = await registerHolderPossessionKeyWithServer({
        publicKeyB64Url,
        secretKeyB64Url,
        rotation:
          forceRotation && existingPublic
            ? { authorized: true, previousPublicKeyB64Url: existingPublic }
            : undefined,
      });
      if (!registration.ok) {
        if (registration.code === "possession_key_rotation_required") {
          setPossessionNote(
            "An active credential is bound to your registered possession key. Use rotate with explicit authorization to replace the key. Abraxas will not silently replace it.",
          );
          return;
        }
        if (registration.preserveLocalKey) {
          throw new Error(registration.code);
        }
        throw new Error(registration.code);
      }
      await storeHolderPossessionKeyMaterial({
        secretKeyB64Url: registration.secretKeyB64Url,
        publicKeyB64Url: registration.publicKeyB64Url,
        rememberOnDevice: rememberPossessionOnDevice,
      });
      if (registration.issuance?.credential_id) {
        setPossessionNote(`Credential issued: ${registration.issuance.credential_id}`);
      } else if (registration.issuance?.deferred) {
        setPossessionNote("Possession key registered. Issuance will complete when eligibility is ready.");
      } else {
        setPossessionNote("Possession key registered on this device.");
      }
      await load();
    } catch {
      setError("Could not register a possession key for this device.");
    } finally {
      setBusy(null);
    }
  }

  async function retryIssuanceBackfill() {
    setBusy("backfill");
    setError(null);
    try {
      const res = await fetch("/api/passport/reusable-credentials/status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_issuance_backfill" }),
      });
      const data = (await res.json()) as { backfill?: { ok?: boolean; code?: string; credential_id?: string } };
      if (!res.ok) {
        throw new Error(data.backfill?.code ?? "backfill_failed");
      }
      setPossessionNote(
        data.backfill?.credential_id
          ? `Credential issued: ${data.backfill.credential_id}`
          : "Issuance retry completed.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Issuance retry failed.");
    } finally {
      setBusy(null);
    }
  }

  async function exportCredential(credentialId: string) {
    setBusy(credentialId);
    try {
      const res = await fetch("/api/passport/reusable-credentials/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_id: credentialId }),
      });
      const data = (await res.json()) as { credential?: unknown; error?: string };
      if (!res.ok || !data.credential) throw new Error(data.error ?? "export_failed");
      const blob = new Blob([JSON.stringify(data.credential, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `abraxas-reusable-credential-${credentialId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Sign in and try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!sessionReady) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
        Sign in to view issuer-signed reusable credentials.
      </p>
    );
  }

  const showIssuedCredentials = credentials.length > 0 && lifecycleState === "credential_issued";
  const deferInstitutional = shouldDeferReusableCredentialActions(holderIdentity);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {holderIdentity ? (
        <div
          role="status"
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            padding: "0.65rem 0.75rem",
            display: "grid",
            gap: "0.35rem",
            background:
              isCanonicalMigrationVisibleSuccess(holderIdentity)
                ? "var(--surface-muted, rgba(34, 197, 94, 0.08))"
                : holderIdentity.state === "identity_lookup_unavailable"
                  ? "var(--surface-muted, rgba(96, 165, 250, 0.08))"
                  : holderIdentity.operator_review_required
                    ? "var(--surface-muted, rgba(255, 193, 7, 0.08))"
                    : undefined,
          }}
        >
          <strong style={{ fontFamily: FONT, fontSize: "0.8rem" }}>{holderIdentity.headline}</strong>
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {holderIdentity.detail}
          </span>
        </div>
      ) : null}
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>
        Reusable credentials are issuer-signed eligibility assurances you hold once. Each institution still receives its
        own partner-bound authorization receipt after you approve a scoped presentation. Credentials are not receipts.
        {sandboxOnly && !issuerBacked ? " Sandbox-labeled demo in this environment." : ""}
      </p>
      {lifecycleHeadline ? (
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            padding: "0.65rem 0.75rem",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <strong style={{ fontFamily: FONT, fontSize: "0.8rem" }}>
            {lifecycleState ? STATE_LABEL[lifecycleState] : lifecycleHeadline}
          </strong>
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {lifecycleDetail}
          </span>
          {recoveryKind === "register_possession_key" && !deferInstitutional ? (
            <Btn variant="secondary" disabled={busy === "possession"} onClick={() => void registerPossessionKey()}>
              {busy === "possession" ? "Registering…" : "Register this device possession key"}
            </Btn>
          ) : null}
          {recoveryKind === "retry_issuance_backfill" && !deferInstitutional ? (
            <Btn variant="secondary" disabled={busy === "backfill"} onClick={() => void retryIssuanceBackfill()}>
              {busy === "backfill" ? "Retrying…" : "Retry credential issuance"}
            </Btn>
          ) : null}
        </div>
      ) : null}
      {recoveryKind !== "register_possession_key" ? (
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label
            style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
              display: "flex",
              gap: "0.45rem",
              alignItems: "flex-start",
              lineHeight: 1.45,
            }}
          >
            <input
              type="checkbox"
              checked={rememberPossessionOnDevice}
              onChange={(e) => {
                setRememberPossessionOnDevice(e.target.checked);
                setPossessionRememberDevice(e.target.checked);
              }}
              style={{ marginTop: "0.15rem", minWidth: 16, minHeight: 16 }}
            />
            Remember possession key on this device (browser IndexedDB). Survives refresh on this browser, not hardware
            protection or account recovery. Abraxas never stores your private key.
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Btn variant="secondary" disabled={busy === "possession"} onClick={() => void registerPossessionKey(false)}>
              {busy === "possession" ? "Registering…" : "Register this device possession key"}
            </Btn>
            <Btn variant="secondary" disabled={busy === "possession"} onClick={() => void registerPossessionKey(true)}>
              Rotate possession key (explicit)
            </Btn>
          </div>
        </div>
      ) : null}
      {possessionNote ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0 }}>{possessionNote}</p>
      ) : null}
      {loading ? <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)" }}>Loading…</p> : null}
      {error ? <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--danger)" }}>{error}</p> : null}
      {showIssuedCredentials
        ? credentials.map((cred) => (
            <div
              key={cred.credential_id}
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: "0.75rem",
                display: "grid",
                gap: "0.35rem",
              }}
            >
              <strong style={{ fontFamily: FONT, fontSize: "0.82rem" }}>{cred.credential_id}</strong>
              <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Issuer: {cred.issuer_id} · Assurance: {cred.assurance_level} · Claims: {cred.claim_labels.join(", ")}
              </span>
              <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Valid until {new Date(cred.expires_at).toLocaleDateString()} · {cred.status}
              </span>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
                {cred.limitations.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Btn
                variant="secondary"
                disabled={busy === cred.credential_id}
                onClick={() => void exportCredential(cred.credential_id)}
              >
                {busy === cred.credential_id ? "Exporting…" : "Export credential (not account recovery)"}
              </Btn>
            </div>
          ))
        : null}
      {!loading && !showIssuedCredentials && !error && lifecycleState !== "credential_issued" ? (
        shouldSuppressRepeatVerificationNudge(holderIdentity) ? (
          <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
            {holderIdentity?.state === "identity_lookup_unavailable"
              ? "Credential status could not be refreshed. Wait and try this page again later rather than starting verification again."
              : "Follow the identity status above. Reusable credentials appear here after approved verification and lifecycle steps complete."}
          </p>
        ) : shouldShowCompleteVerificationPrompt(holderIdentity) ? (
          <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
            A signed reusable credential has not been persisted yet. Complete identity verification when you are ready,
            then finish the lifecycle step above.
          </p>
        ) : (
          <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
            A signed reusable credential has not been persisted yet. Complete the lifecycle step above before expecting
            issuance.
          </p>
        )
      ) : null}
      {showIssuedCredentials && !deferInstitutional ? (
        <PassportInstitutionalPresentationPanel sessionReady={sessionReady} credentials={credentials} />
      ) : null}
    </div>
  );
}
