"use client";
// FILE: components/partner/launchpad/HostedHandoffControls.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { PartnerBindingSelector } from "@/components/partner/launchpad/PartnerBindingSelector";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HOSTED_HANDOFF_CHECKLIST, HOSTED_HANDOFF_DOCS, HOSTED_HANDOFF_NOTICE } from "@/lib/partner/hostedHandoff/contract";
import { resolveChainAttestationSolanaKeysUrl } from "@/lib/product/canonicalProductOrigin";
import {
  buildPartnerCallbackResultPath,
  hostedHandoffLaunchpadFreshReadyHeading,
  hostedHandoffLaunchpadFreshReadyOpenLabel,
  hostedHandoffLaunchpadHeading,
  hostedHandoffLaunchpadStatusLine,
  resolveHostedHandoffLaunchpadPhase,
} from "@/lib/partner/launchpad/hostedHandoffLaunchpadUi";

const FONT = ABRAXAS_FONT_SANS;
const HANDOFF_REF = /^hpf_[0-9a-f]{16}$/;
const storageKey = (applicationId: string) => `abraxas:launchpad:handoff:${applicationId}`;
const PARTNER_ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const APPLICATION_ID = /^[0-9a-f]{8}-[0-9a-f-]{27,35}$/;
const DEPLOYMENT_REF = /^ogd_[0-9a-f]{32}$/;
const SIGNER_KEY_ID = /^cask_[0-9a-f]{24}$/;
const RECEIPT_ID = /^dr_[A-Za-z0-9_-]+$/;

type HandoffStatus = "created" | "completed" | "consumed" | "cancelled" | "expired" | "";

export function HostedHandoffControls({ applicationId, partnerId }: { applicationId: string; partnerId: string }) {
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [handoffRef, setHandoffRef] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<HandoffStatus>("");
  const [checking, setChecking] = useState(false);
  const [deploymentRef, setDeploymentRef] = useState("");
  const [signerKeyId, setSignerKeyId] = useState("");
  const [commandCopied, setCommandCopied] = useState(false);
  const [publicReceiptId, setPublicReceiptId] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [freshReady, setFreshReady] = useState(false);
  const [awaitingNewHandoff, setAwaitingNewHandoff] = useState(false);

  const phase = useMemo(() => {
    if (awaitingNewHandoff && !handoffRef) return "ready";
    return resolveHostedHandoffLaunchpadPhase(status);
  }, [awaitingNewHandoff, handoffRef, status]);

  const heading = freshReady && phase === "pending"
    ? hostedHandoffLaunchpadFreshReadyHeading()
    : hostedHandoffLaunchpadHeading(phase);

  const statusLine = hostedHandoffLaunchpadStatusLine({ phase, handoffRef });

  const resultHref = useMemo(() => {
    if (!publicReceiptId || !RECEIPT_ID.test(publicReceiptId) || !PARTNER_ID.test(partnerId)) return null;
    return buildPartnerCallbackResultPath({
      receiptId: publicReceiptId,
      partnerId,
      policyId,
    });
  }, [partnerId, policyId, publicReceiptId]);

  async function createHandoff() {
    setBusy(true);
    setError("");
    setFreshReady(false);
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/hosted-handoff`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runtime: "universal_https",
          ...(bindingId ? { binding_id: bindingId } : {}),
        }),
      });
      const data = await res.json() as {
        hosted_url?: string;
        handoff_ref?: string;
        status?: HandoffStatus;
        error?: string;
      };
      if (!res.ok || !data.hosted_url) {
        const errCode = typeof data.error === "string" ? data.error : "";
        setError(
          errCode === "not_configured"
            ? "Save Partner Flow configuration and an approved callback first."
            : errCode === "holder_origin_mismatch" || errCode === "holder_origin_unconfigured"
              ? "This Launchpad deployment cannot issue a valid holder link yet. Contact your operator — Demo and Production holder URLs must match the environment where the request is stored."
              : "Could not create a handoff.",
        );
        return;
      }
      setUrl(data.hosted_url);
      if (data.handoff_ref && HANDOFF_REF.test(data.handoff_ref)) {
        setHandoffRef(data.handoff_ref);
        window.sessionStorage.setItem(storageKey(applicationId), data.handoff_ref);
      }
      setStatus(data.status ?? "created");
      setPublicReceiptId(null);
      setPolicyId(null);
      setAwaitingNewHandoff(false);
      setFreshReady(true);
    } catch {
      setError("Could not create a handoff.");
    } finally {
      setBusy(false);
    }
  }

  const applyHandoffView = useCallback((data: {
    hosted_url?: string;
    status?: HandoffStatus;
    public_receipt_id?: string | null;
    policy_id?: string;
  }) => {
    if (data.hosted_url) setUrl(data.hosted_url);
    if (data.status) setStatus(data.status);
    if (typeof data.policy_id === "string") setPolicyId(data.policy_id);
    if (data.public_receipt_id && RECEIPT_ID.test(data.public_receipt_id)) {
      setPublicReceiptId(data.public_receipt_id);
    } else if (data.status === "created") {
      setPublicReceiptId(null);
    }
    setError("");
  }, []);

  const checkStatus = useCallback(async () => {
    if (!handoffRef) return;
    setChecking(true);
    try {
      const res = await fetch(
        `/api/launchpad/applications/${applicationId}/hosted-handoff?handoff_ref=${encodeURIComponent(handoffRef)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await res.json() as {
        hosted_url?: string;
        status?: HandoffStatus;
        public_receipt_id?: string | null;
        policy_id?: string;
        error?: string;
      };
      if (!res.ok || !data.status) {
        if (res.status === 404) {
          window.sessionStorage.removeItem(storageKey(applicationId));
          setHandoffRef("");
          setUrl("");
          setStatus("");
          setPublicReceiptId(null);
          setFreshReady(false);
          setError("The previous handoff is unavailable. Start another verification.");
        } else {
          setError(res.status === 401 ? "Partner session expired. Sign in again, then check status." : "Could not check verification status.");
        }
        return;
      }
      applyHandoffView(data);
      if (data.status !== "created") setFreshReady(false);
    } catch {
      setError("Could not check verification status.");
    } finally {
      setChecking(false);
    }
  }, [applicationId, applyHandoffView, handoffRef]);

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

  function startAnotherVerification() {
    window.sessionStorage.removeItem(storageKey(applicationId));
    setHandoffRef("");
    setUrl("");
    setStatus("");
    setPublicReceiptId(null);
    setPolicyId(null);
    setFreshReady(false);
    setAwaitingNewHandoff(true);
    setError("");
  }

  const commandReady = (status === "completed" || status === "consumed")
    && HANDOFF_REF.test(handoffRef)
    && PARTNER_ID.test(partnerId)
    && APPLICATION_ID.test(applicationId)
    && DEPLOYMENT_REF.test(deploymentRef)
    && SIGNER_KEY_ID.test(signerKeyId);
  const ubuntuCommand = commandReady ? `cd ~/abraxas-devnet
git pull --ff-only
curl -fsS ${resolveChainAttestationSolanaKeysUrl()} -o /tmp/abraxas-solana-signer-public.json
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

  const openVerificationLabel = phase === "pending"
    ? freshReady
      ? hostedHandoffLaunchpadFreshReadyOpenLabel()
      : "Continue verification"
    : null;

  const showBindingSelector = phase === "none" || phase === "ready" || awaitingNewHandoff;
  const showCreateHandoff = phase === "none" || phase === "ready" || phase === "expired" || phase === "cancelled";
  const holderLinkIsReplay = phase === "completed";

  return (
    <section
      className="abx-launchpad-handoff-controls"
      aria-labelledby="hosted-handoff-heading"
      style={{ marginTop: "1.15rem" }}
    >
      <h3 id="hosted-handoff-heading" style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
        {heading}
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.65rem" }}>
        {HOSTED_HANDOFF_NOTICE} The holder URL contains only an opaque request reference.
      </p>

      {(handoffRef || phase !== "none") && (
        <div
          className={`abx-launchpad-handoff-controls__status${phase === "completed" ? " abx-launchpad-handoff-controls__status--completed" : ""}`}
          role="status"
        >
          <p className="abx-launchpad-handoff-controls__status-title">Status</p>
          <p className="abx-launchpad-handoff-controls__status-line">{statusLine}</p>
          {handoffRef ? (
            <p className="abx-launchpad-handoff-controls__status-line abx-launchpad-handoff-controls__ref" style={{ marginTop: "0.45rem" }}>
              Handoff reference: <code style={{ userSelect: "text" }}>{handoffRef}</code>
              {publicReceiptId ? (
                <>
                  {" · "}
                  Receipt: <code style={{ userSelect: "text" }}>{publicReceiptId}</code>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      )}

      {showBindingSelector && (
        <div style={{ marginBottom: "0.75rem" }}>
          <PartnerBindingSelector
            applicationId={applicationId}
            selectedBindingId={bindingId}
            onSelect={setBindingId}
            label="Integration policy"
          />
        </div>
      )}

      {error && <p role="alert" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "#f87171" }}>{error}</p>}

      <div className="abx-launchpad-handoff-controls__actions abx-launchpad-handoff-controls__actions--row">
        {showCreateHandoff && phase !== "expired" && phase !== "cancelled" && (
          <Btn size="sm" loading={busy} disabled={busy} onClick={() => void createHandoff()}>
            Create handoff
          </Btn>
        )}
        {phase === "completed" && resultHref && (
          <Btn size="sm" href={resultHref} target="_blank" rel="noopener noreferrer">
            View completed result
          </Btn>
        )}
        {phase === "completed" && (
          <Btn size="sm" variant="secondary" disabled={busy} onClick={startAnotherVerification}>
            Start another verification
          </Btn>
        )}
        {(phase === "expired" || phase === "cancelled") && (
          <Btn size="sm" loading={busy} disabled={busy} onClick={() => void createHandoff()}>
            Start another verification
          </Btn>
        )}
        {url && openVerificationLabel && phase === "pending" && (
          <Btn size="sm" href={url} target="_blank" rel="noopener noreferrer">
            {openVerificationLabel} ↗
          </Btn>
        )}
        {url && phase === "pending" && (
          <Btn
            size="sm"
            variant="secondary"
            loading={checking}
            disabled={checking}
            onClick={() => void checkStatus()}
          >
            Refresh status
          </Btn>
        )}
        {url && (phase === "pending" || (phase === "completed" && !holderLinkIsReplay)) && (
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
        {url && holderLinkIsReplay && (
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              });
            }}
          >
            {copied ? "Holder link copied" : "Copy holder link (same verification)"}
          </Btn>
        )}
      </div>

      {url && phase === "pending" && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          Open verification in a new tab. The holder reviews the request and approves sharing before Abraxas can issue a receipt.
        </p>
      )}

      {url && holderLinkIsReplay && (
        <p role="note" style={{ fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.55, color: "var(--text-muted)", marginTop: "0.5rem" }}>
          Reopening this holder link shows the same signed result — it does not create a new receipt or metering event. Use Start another verification for a fresh run.
        </p>
      )}

      {commandReady && (
        <div style={{
          marginTop: "0.75rem", padding: "0.85rem", borderRadius: 10,
          border: "1px solid rgba(94, 234, 212, 0.35)", background: "rgba(20, 184, 166, 0.06)",
        }}>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, margin: "0 0 0.6rem" }}>
            Finish the devnet proof
          </p>
          <ol style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: "1.1rem", margin: "0 0 0.7rem" }}>
            <li>Copy the prepared command below.</li>
            <li>Paste it into Ubuntu and enter the sandbox API key when prompted.</li>
            <li>When it succeeds, open the printed <code>proof_url</code> to see and share the verified result.</li>
          </ol>
          <Btn
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(ubuntuCommand).then(() => {
                setCommandCopied(true);
                setTimeout(() => setCommandCopied(false), 1600);
              });
            }}
          >
            {commandCopied ? "Ubuntu command copied" : "1. Copy Ubuntu proof command"}
          </Btn>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0.45rem 0 0" }}>
            The API key stays private: it is requested inside Ubuntu and is never placed in the copied command or browser page.
          </p>
        </div>
      )}

      <ul style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55, paddingLeft: "1.1rem", marginTop: "0.85rem" }}>
        {HOSTED_HANDOFF_CHECKLIST.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <a href={HOSTED_HANDOFF_DOCS} style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--accent)" }}>
        Handoff docs
      </a>
    </section>
  );
}
