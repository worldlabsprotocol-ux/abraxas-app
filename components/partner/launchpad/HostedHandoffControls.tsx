"use client";
// FILE: components/partner/launchpad/HostedHandoffControls.tsx

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HOSTED_HANDOFF_CHECKLIST, HOSTED_HANDOFF_DOCS, HOSTED_HANDOFF_NOTICE } from "@/lib/partner/hostedHandoff/contract";

const FONT = ABRAXAS_FONT_SANS;
const HANDOFF_REF = /^hpf_[0-9a-f]{16}$/;
const storageKey = (applicationId: string) => `abraxas:launchpad:handoff:${applicationId}`;
const PARTNER_ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const APPLICATION_ID = /^[0-9a-f]{8}-[0-9a-f-]{27,35}$/;
const DEPLOYMENT_REF = /^ogd_[0-9a-f]{32}$/;
const SIGNER_KEY_ID = /^cask_[0-9a-f]{24}$/;

export function HostedHandoffControls({ applicationId, partnerId }: { applicationId: string; partnerId: string }) {
  const [url, setUrl] = useState("");
  const [handoffRef, setHandoffRef] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"created" | "completed" | "consumed" | "cancelled" | "expired" | "">("");
  const [checking, setChecking] = useState(false);
  const [deploymentRef, setDeploymentRef] = useState("");
  const [signerKeyId, setSignerKeyId] = useState("");
  const [commandCopied, setCommandCopied] = useState(false);

  async function createHandoff() {
    setBusy(true);
    setError("");
    setUrl("");
    setHandoffRef("");
    setStatus("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/hosted-handoff`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runtime: "universal_https" }),
      });
      const data = await res.json() as { hosted_url?: string; handoff_ref?: string; status?: typeof status; error?: string };
      if (!res.ok || !data.hosted_url) {
        setError(data.error === "not_configured"
          ? "Save Partner Flow configuration and an approved callback first."
          : "Could not create a handoff.");
        return;
      }
      setUrl(data.hosted_url);
      if (data.handoff_ref && HANDOFF_REF.test(data.handoff_ref)) {
        setHandoffRef(data.handoff_ref);
        window.sessionStorage.setItem(storageKey(applicationId), data.handoff_ref);
      }
      setStatus(data.status ?? "created");
    } catch {
      setError("Could not create a handoff.");
    } finally {
      setBusy(false);
    }
  }

  const checkStatus = useCallback(async () => {
    if (!handoffRef) return;
    setChecking(true);
    try {
      const res = await fetch(
        `/api/launchpad/applications/${applicationId}/hosted-handoff?handoff_ref=${encodeURIComponent(handoffRef)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await res.json() as { hosted_url?: string; status?: typeof status; error?: string };
      if (!res.ok || !data.status) {
        if (res.status === 404) {
          window.sessionStorage.removeItem(storageKey(applicationId));
          setHandoffRef("");
          setUrl("");
          setStatus("");
          setError("The previous handoff is unavailable. Create a new secure handoff.");
        } else {
          setError(res.status === 401 ? "Partner session expired. Sign in again, then check status." : "Could not check verification status.");
        }
        return;
      }
      if (data.hosted_url) setUrl(data.hosted_url);
      setStatus(data.status);
      setError("");
    } catch {
      setError("Could not check verification status.");
    } finally {
      setChecking(false);
    }
  }, [applicationId, handoffRef]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey(applicationId)) ?? "";
    if (HANDOFF_REF.test(saved)) setHandoffRef(saved);
  }, [applicationId]);

  useEffect(() => {
    if (handoffRef && status === "") void checkStatus();
  }, [checkStatus, handoffRef, status]);

  const loadProofBinding = useCallback(async () => {
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/onchain-gate-deployments`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json() as {
        deployments?: Array<{
          deployment_ref?: string;
          signer_key_id?: string;
          network_id?: string;
          status?: string;
          require_institutional?: boolean;
        }>;
      };
      if (!res.ok) return;
      const match = data.deployments?.find((item) =>
        item.network_id === "solana_devnet"
        && item.status === "verified_sandbox"
        && item.require_institutional === true
        && DEPLOYMENT_REF.test(item.deployment_ref ?? "")
        && SIGNER_KEY_ID.test(item.signer_key_id ?? ""),
      );
      if (match?.deployment_ref && match.signer_key_id) {
        setDeploymentRef(match.deployment_ref);
        setSignerKeyId(match.signer_key_id);
      }
    } catch {
      // Status remains useful even when the copyable operator command is unavailable.
    }
  }, [applicationId]);

  useEffect(() => {
    if ((status === "completed" || status === "consumed") && (!deploymentRef || !signerKeyId)) {
      void loadProofBinding();
    }
  }, [deploymentRef, loadProofBinding, signerKeyId, status]);

  useEffect(() => {
    if (!handoffRef || status !== "created") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkStatus();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [checkStatus, handoffRef, status]);

  const commandReady = (status === "completed" || status === "consumed")
    && HANDOFF_REF.test(handoffRef)
    && PARTNER_ID.test(partnerId)
    && APPLICATION_ID.test(applicationId)
    && DEPLOYMENT_REF.test(deploymentRef)
    && SIGNER_KEY_ID.test(signerKeyId);
  const ubuntuCommand = commandReady ? `cd ~/abraxas-devnet
git pull --ff-only
curl -fsS https://demo.abraxasworld.xyz/api/chain-attestations/verification-keys/solana -o /tmp/abraxas-solana-signer-public.json
export ABRAXAS_GATE_PARTNER_ID='${partnerId}'
export ABRAXAS_GATE_APPLICATION_ID='${applicationId}'
export ABRAXAS_GATE_ADMIN_KEYPAIR_PATH="$HOME/.config/solana/id.json"
export ABRAXAS_GATE_ADMIN_PUBKEY="$(solana-keygen pubkey "$ABRAXAS_GATE_ADMIN_KEYPAIR_PATH")"
export ABRAXAS_GATE_SIGNER_KEY_ID='${signerKeyId}'
read -rsp "Sandbox abx_test key: " ABRAXAS_SANDBOX_PARTNER_API_KEY; echo
export ABRAXAS_SANDBOX_PARTNER_API_KEY
npx tsx scripts/solana-devnet-proof-issue-and-run-local.ts \\
  '${handoffRef}' \\
  '${deploymentRef}' \\
  /tmp/abraxas-solana-signer-public.json \\
  --ownership-reviewed --confirm
unset ABRAXAS_SANDBOX_PARTNER_API_KEY` : "";

  return (
    <section aria-labelledby="hosted-handoff-heading" style={{ marginTop: "1.15rem" }}>
      <h3 id="hosted-handoff-heading" style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
        Create a secure handoff
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.65rem" }}>
        {HOSTED_HANDOFF_NOTICE} The holder URL contains only an opaque request reference.
      </p>
      {error && <p role="alert" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "#f87171" }}>{error}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.65rem" }}>
        <Btn size="sm" loading={busy} disabled={busy} onClick={() => void createHandoff()}>
          Create a secure handoff
        </Btn>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "center", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)" }}>
            Open sandbox verification ↗
          </a>
        )}
        {url && (
          <Btn
            size="sm"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              });
            }}
          >
            {copied ? "Hosted URL copied" : "Copy Hosted Partner Flow URL"}
          </Btn>
        )}
      </div>
      {url && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
          Open the verification in a new tab. The person completing it reviews the request and gives consent before Abraxas can issue a receipt. Keep this handoff link private.
        </p>
      )}
      {handoffRef && (
        <div style={{ margin: "0.7rem 0" }}>
          <p role="status" style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, color: status === "completed" || status === "consumed" ? "#5EEAD4" : "var(--text-secondary)", margin: "0 0 0.45rem" }}>
            {status === "completed" || status === "consumed"
              ? "Verification complete. This handoff is ready for the Ubuntu devnet proof command."
              : status === "expired"
                ? "This handoff expired. Create a new secure handoff."
                : status === "cancelled"
                  ? "This handoff was cancelled. Create a new secure handoff."
                  : "Waiting for the holder to finish verification and consent…"}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: "0 0 0.45rem" }}>
            Devnet proof handoff ref: <code style={{ userSelect: "text" }}>{handoffRef}</code>
          </p>
          {status === "created" && (
            <Btn size="sm" variant="secondary" loading={checking} disabled={checking} onClick={() => void checkStatus()}>
              Check verification status
            </Btn>
          )}
          {commandReady && (
            <div style={{ marginTop: "0.65rem" }}>
              <Btn
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(ubuntuCommand).then(() => {
                    setCommandCopied(true);
                    setTimeout(() => setCommandCopied(false), 1600);
                  });
                }}
              >
                {commandCopied ? "Ubuntu command copied" : "Copy Ubuntu proof command"}
              </Btn>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0.45rem 0 0" }}>
                Paste it into Ubuntu. It asks for the sandbox API key privately and never places that key in the command or page.
              </p>
            </div>
          )}
        </div>
      )}
      <ul style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55, paddingLeft: "1.1rem" }}>
        {HOSTED_HANDOFF_CHECKLIST.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <a href={HOSTED_HANDOFF_DOCS} style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--accent)" }}>
        Handoff docs
      </a>
    </section>
  );
}
