"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { AbraxasIdentityCapture } from "@/components/passport/AbraxasIdentityCapture";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
import { GoodTroublePurchaseDobForm } from "@/components/partner/GoodTroublePurchaseDobForm";
import { GoodTroublePurchaseShareStep } from "@/components/partner/GoodTroublePurchaseShareStep";
import { HolderDecisionComplete } from "@/components/protocol/HolderDecisionComplete";
import { resolvePartnerDisplayName, resolvePartnerReturnLabel } from "@/lib/partner/partnerVerifyDisplay";
import {
  GOOD_TROUBLE_PURCHASE_PATH_STEPS,
  VerificationPath,
  type VerificationPathStep,
} from "@/components/protocol/VerificationPath";
import {
  GOOD_TROUBLE_PURCHASE_REUSE_ACTION,
  GOOD_TROUBLE_PURCHASE_UNDER_21_MESSAGE,
  GOOD_TROUBLE_PURCHASE_UNDER_21_TITLE,
  GOOD_TROUBLE_PURCHASE_VERIFY_ACTION,
  GOOD_TROUBLE_PURCHASE_VERIFY_INTRO,
} from "@/lib/partner/goodTroublePurchaseFlow";
import { holderSafeClientMessage } from "@/lib/partner/holderExperience";
import { REUSE_CONFIRM_POINTS, type ReuseClientView } from "@/lib/passport/reusableEligibility/contract";
import type { usePartnerFlowHandoff } from "@/lib/passport/partnerFlowHandoff";

type Handoff = ReturnType<typeof usePartnerFlowHandoff>;

type GtPhase =
  | "loading"
  | "reuse"
  | "dob"
  | "under_21"
  | "verify"
  | "review"
  | "share"
  | "done";

export function GoodTroublePurchaseContinueFlow({
  partnerId,
  policyId,
  partnerName,
  verifyRequestId,
  returnUrl,
  suiAddress,
  email,
  identityStatus,
  identityComplete,
  veriffConfigured,
  idvProvider,
  handoff,
  refresh,
}: {
  partnerId: string;
  policyId: string;
  partnerName: string;
  verifyRequestId: string;
  returnUrl: string;
  suiAddress: string;
  email: string;
  identityStatus: string;
  identityComplete: boolean;
  veriffConfigured: boolean;
  idvProvider: "veriff" | "manual";
  handoff: Handoff;
  refresh: () => void;
}) {
  const [phase, setPhase] = useState<GtPhase>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reuseView, setReuseView] = useState<ReuseClientView | null>(null);
  const [methodQualified, setMethodQualified] = useState(false);
  const [startingIdv, setStartingIdv] = useState(false);
  const [captureStarted, setCaptureStarted] = useState(false);

  async function qualifyIdentityEvidence() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/partner-verify/method-qualification", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verify_request: verifyRequestId,
          method_id: "identity_liveness",
        }),
      });
      const data = await res.json() as { method_qualified?: boolean; issuedReceipt?: boolean; error?: string };
      if (res.ok && data.method_qualified === true && data.issuedReceipt !== true) {
        setMethodQualified(true);
        setPhase("share");
        return;
      }
      if (identityComplete) {
        setError(holderSafeClientMessage(data.error ?? "Verification completed but could not advance. Try again."));
      }
    } catch {
      setError(holderSafeClientMessage("Could not confirm verification. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const loadState = useCallback(async () => {
    setError(null);
    try {
      const qualRes = await fetch(
        `/api/v1/partner-verify/method-qualification?verify_request=${encodeURIComponent(verifyRequestId)}`,
        { credentials: "include" },
      );
      const qualBody = await qualRes.json() as {
        method_qualified?: boolean;
        issuedReceipt?: boolean;
        reuse?: ReuseClientView;
      };
      if (qualBody.reuse) setReuseView(qualBody.reuse);
      const qualified = qualRes.ok && qualBody.method_qualified === true && qualBody.issuedReceipt !== true;
      setMethodQualified(qualified);

      if (handoff.ready || handoff.phase === "completed") {
        setPhase("done");
        return;
      }
      if (qualified) {
        setPhase("share");
        return;
      }
      if (qualBody.reuse?.available) {
        setPhase("reuse");
        return;
      }
      if (identityComplete) {
        await qualifyIdentityEvidence();
        return;
      }
      if (identityStatus === "pending") {
        setPhase("review");
        return;
      }

      const dobRes = await fetch(
        `/api/v1/partner-verify/good-trouble/dob-prequal?verify_request=${encodeURIComponent(verifyRequestId)}`,
        { credentials: "include" },
      );
      const dobBody = await dobRes.json() as {
        prequal_complete?: boolean;
        age_band?: "over_21" | "under_21";
      };
      if (dobBody.prequal_complete && dobBody.age_band === "under_21") {
        setPhase("under_21");
        return;
      }
      if (dobBody.prequal_complete && dobBody.age_band === "over_21") {
        setPhase("verify");
        return;
      }
      setPhase("dob");
    } catch {
      setError(holderSafeClientMessage("Could not load your verification step. Refresh and try again."));
      setPhase("dob");
    }
  }, [verifyRequestId, handoff.ready, handoff.phase, identityComplete, identityStatus]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (!identityComplete || methodQualified) return;
    void qualifyIdentityEvidence();
  }, [identityComplete, methodQualified, verifyRequestId]);

  async function submitDob(isoDate: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/partner-verify/good-trouble/dob-prequal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verify_request: verifyRequestId,
          date_of_birth: isoDate,
          partner_id: partnerId,
          policy_id: policyId,
        }),
      });
      const data = await res.json() as { age_band?: "over_21" | "under_21"; code?: string };
      if (!res.ok) {
        setError(holderSafeClientMessage("Enter a valid date of birth and try again."));
        return;
      }
      if (data.age_band === "under_21") {
        setPhase("under_21");
        return;
      }
      setPhase("verify");
    } catch {
      setError(holderSafeClientMessage("Could not check your age. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function reuseExistingProof() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/partner-verify/method-qualification", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verify_request: verifyRequestId,
          method_id: "reuse_existing_proof",
        }),
      });
      const data = await res.json() as { method_qualified?: boolean; issuedReceipt?: boolean; error?: string };
      if (!res.ok || data.method_qualified !== true) {
        setError(holderSafeClientMessage(data.error ?? "Existing verification could not be reused."));
        setPhase("dob");
        return;
      }
      setMethodQualified(true);
      setPhase("share");
    } catch {
      setError(holderSafeClientMessage("Could not reuse verification. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function startIdentityVerification() {
    if (idvProvider === "manual") {
      setCaptureStarted(true);
      return;
    }
    setStartingIdv(true);
    setError(null);
    try {
      const sessionRes = await fetch("/api/idv/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress, document_type: "PASSPORT" }),
      });
      const sessionData = await sessionRes.json() as { session_url?: string | null; error?: string };
      if (!sessionRes.ok || !sessionData.session_url) {
        setError(holderSafeClientMessage(sessionData.error ?? "Age verification could not be started."));
        return;
      }
      void refresh();
      await new Promise<void>((resolve, reject) => {
        if (document.querySelector('script[src="https://cdn.veriff.me/incontext/js/v1/veriff.js"]')) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = "https://cdn.veriff.me/incontext/js/v1/veriff.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("script"));
        document.body.appendChild(s);
      });
      const w = window as unknown as {
        veriffSDK: { createVeriffFrame: (opts: { url: string }) => void };
      };
      w.veriffSDK.createVeriffFrame({ url: sessionData.session_url });
      setPhase("review");
    } catch {
      setError(holderSafeClientMessage("Age verification could not be started. Try again."));
    } finally {
      setStartingIdv(false);
    }
  }

  const progress = useMemo((): { active: VerificationPathStep; completedThrough: VerificationPathStep | null } => {
    if (phase === "done") return { active: "ready", completedThrough: "consent" };
    if (phase === "share") return { active: "consent", completedThrough: "verify" };
    if (phase === "review" || phase === "verify") return { active: "verify", completedThrough: "request" };
    if (phase === "reuse" || phase === "dob" || phase === "under_21" || phase === "loading") {
      return { active: "request", completedThrough: null };
    }
    return { active: "request", completedThrough: null };
  }, [phase]);

  if (phase === "loading") {
    return <p role="status">Loading…</p>;
  }

  return (
    <>
      <VerificationPath
        active={progress.active}
        completedThrough={progress.completedThrough}
        steps={GOOD_TROUBLE_PURCHASE_PATH_STEPS}
        compact
      />
      <PartnerFlowReturnHandler handoff={handoff} />

      {phase === "reuse" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.85rem", lineHeight: 1.55 }}>
            {(reuseView?.explanation?.length ? reuseView.explanation : REUSE_CONFIRM_POINTS).map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <Btn disabled={busy} onClick={() => void reuseExistingProof()}>
            {busy ? "Confirming…" : GOOD_TROUBLE_PURCHASE_REUSE_ACTION}
          </Btn>
          <button
            type="button"
            onClick={() => setPhase("dob")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--accent)",
              fontSize: "0.82rem",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Verify a different way
          </button>
        </div>
      )}

      {phase === "dob" && (
        <GoodTroublePurchaseDobForm
          busy={busy}
          error={error}
          onSubmit={(iso) => void submitDob(iso)}
        />
      )}

      {phase === "under_21" && (
        <StatusBanner tone="info" title={GOOD_TROUBLE_PURCHASE_UNDER_21_TITLE}>
          {GOOD_TROUBLE_PURCHASE_UNDER_21_MESSAGE}
        </StatusBanner>
      )}

      {phase === "verify" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Verify your age</p>
          <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.65 }}>
            {GOOD_TROUBLE_PURCHASE_VERIFY_INTRO}
          </p>
          {idvProvider === "manual" && captureStarted ? (
            <AbraxasIdentityCapture
              email={email}
              suiAddress={suiAddress}
              pendingReview={identityStatus === "pending"}
              capturePolicy={{
                verificationRequestId: verifyRequestId,
                policyId,
                partnerId,
                minimumAge: 21,
              }}
              onSubmitted={() => {
                setPhase("review");
                void refresh();
              }}
            />
          ) : (
            <Btn disabled={startingIdv || busy} onClick={() => void startIdentityVerification()}>
              {startingIdv ? "Starting…" : GOOD_TROUBLE_PURCHASE_VERIFY_ACTION}
            </Btn>
          )}
          {!veriffConfigured && idvProvider === "veriff" && (
            <p role="alert" style={{ color: "var(--text-secondary)" }}>
              Age verification is temporarily unavailable. Return to Good Trouble and try again later.
            </p>
          )}
        </div>
      )}

      {phase === "review" && (
        <StatusBanner tone="pending" title="Verification in progress">
          Your age verification is being reviewed. This page will update when it is ready.
        </StatusBanner>
      )}

      {phase === "share" && verifyRequestId && (
        <GoodTroublePurchaseShareStep
          verifyRequestId={verifyRequestId}
          partnerId={partnerId}
          policyId={policyId}
          returnUrl={returnUrl}
          onReturn={() => handoff.navigateToPartner()}
          returnLoading={handoff.inFlight}
        />
      )}

      {phase === "done" && handoff.receiptId && returnUrl && (
        <HolderDecisionComplete
          receiptId={handoff.receiptId}
          partnerName={resolvePartnerDisplayName(partnerId)}
          policyId={policyId}
          returnLabel={resolvePartnerReturnLabel(partnerId)}
          onReturn={() => handoff.navigateToPartner()}
          returnLoading={handoff.inFlight}
        />
      )}

      {error && phase !== "dob" && (
        <p role="alert" aria-live="assertive" style={{ marginTop: "0.75rem", color: "var(--text-secondary)" }}>
          {error}
        </p>
      )}
    </>
  );
}
