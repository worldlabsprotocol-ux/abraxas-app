"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
import { GoodTroublePurchaseDobForm } from "@/components/partner/GoodTroublePurchaseDobForm";
import { GoodTroublePurchaseShareStep } from "@/components/partner/GoodTroublePurchaseShareStep";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";
import {
  GOOD_TROUBLE_PURCHASE_PATH_STEPS,
  VerificationPath,
  type VerificationPathStep,
} from "@/components/protocol/VerificationPath";
import {
  GOOD_TROUBLE_PURCHASE_REUSE_ACTION,
  GOOD_TROUBLE_PURCHASE_UNDER_21_MESSAGE,
  GOOD_TROUBLE_PURCHASE_UNDER_21_TITLE,
} from "@/lib/partner/goodTroublePurchaseFlow";
import { holderSafeClientMessage } from "@/lib/partner/holderExperience";
import {
  mapGoodTroublePurchaseAttestError,
  mapGoodTroublePurchaseQualifyError,
} from "@/lib/partner/goodTroublePurchaseSelfAttestErrors";
import { REUSE_CONFIRM_POINTS, type ReuseClientView } from "@/lib/passport/reusableEligibility/contract";
import {
  GoodTroublePrivacySequence,
  type GoodTroublePrivacyPhase,
} from "@/components/partner/GoodTroublePrivacySequence";
import type { usePartnerFlowHandoff } from "@/lib/passport/partnerFlowHandoff";

type Handoff = ReturnType<typeof usePartnerFlowHandoff>;

type GtPhase =
  | "loading"
  | "session_required"
  | "handoff_unavailable"
  | "reuse"
  | "dob"
  | "under_21"
  | "share"
  | "done";

export function GoodTroublePurchaseContinueFlow({
  partnerId,
  policyId,
  partnerName,
  verifyRequestId,
  returnUrl,
  handoff,
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

  const loadState = useCallback(async () => {
    setError(null);
    try {
      const qualRes = await fetch(
        `/api/v1/partner-verify/method-qualification?verify_request=${encodeURIComponent(verifyRequestId)}`,
        { credentials: "include" },
      );
      const qualBody = await qualRes.json() as {
        code?: string;
        method_qualified?: boolean;
        issuedReceipt?: boolean;
        reuse?: ReuseClientView;
      };
      if (handoff.ready || handoff.phase === "completed") {
        setPhase("done");
        return;
      }
      if (!qualRes.ok) {
        if (qualRes.status === 401) {
          setPhase("session_required");
        } else {
          setPhase("handoff_unavailable");
        }
        return;
      }
      if (qualBody.reuse) setReuseView(qualBody.reuse);
      const qualified = qualBody.method_qualified === true && qualBody.issuedReceipt !== true;

      if (qualified) {
        setPhase("share");
        return;
      }
      if (qualBody.reuse?.available) {
        setPhase("reuse");
        return;
      }
      setPhase("dob");
    } catch {
      setError(holderSafeClientMessage("Could not load your verification step. Refresh and try again."));
      setPhase("handoff_unavailable");
    }
  }, [verifyRequestId, handoff.ready, handoff.phase]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function submitDobAndQualify(isoDate: string) {
    setBusy(true);
    setError(null);
    try {
      const attestRes = await fetch("/api/age-assurance/self-attest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_of_birth: isoDate,
          partner_id: partnerId,
          policy_id: policyId,
          purpose: "purchase",
        }),
      });
      const attestData = await attestRes.json() as {
        ok?: boolean;
        age_band?: "over_21" | "under_21";
        code?: string;
      };
      if (!attestRes.ok || !attestData.ok) {
        setError(mapGoodTroublePurchaseAttestError(attestData.code));
        return;
      }
      if (attestData.age_band === "under_21") {
        setPhase("under_21");
        return;
      }

      const qualRes = await fetch("/api/v1/partner-verify/method-qualification", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verify_request: verifyRequestId,
          method_id: "self_attestation",
        }),
      });
      const qualData = await qualRes.json() as {
        method_qualified?: boolean;
        error?: string;
        code?: string;
      };
      if (!qualRes.ok || qualData.method_qualified !== true) {
        setError(mapGoodTroublePurchaseQualifyError(qualData.code));
        return;
      }
      setPhase("share");
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
      setPhase("share");
    } catch {
      setError(holderSafeClientMessage("Could not reuse verification. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const progress = useMemo((): { active: VerificationPathStep; completedThrough: VerificationPathStep | null } => {
    if (phase === "done") return { active: "ready", completedThrough: "consent" };
    if (phase === "share") return { active: "consent", completedThrough: "verify" };
    if (phase === "reuse" || phase === "dob" || phase === "under_21" || phase === "loading") {
      return { active: "request", completedThrough: null };
    }
    return { active: "request", completedThrough: null };
  }, [phase]);

  const privacyPhase: GoodTroublePrivacyPhase = (() => {
    if (phase === "done") return "return";
    if (phase === "share") return "share";
    if (phase === "under_21") return "result";
    if (phase === "dob") return "dob";
    if (phase === "reuse") return "derive";
    return "derive";
  })();

  if (phase === "loading") {
    return <p role="status">Loading…</p>;
  }

  if (phase === "session_required") {
    return <StatusBanner tone="error" title="Session required">Your browser session could not be confirmed. Return to Good Trouble and open a fresh verification link.</StatusBanner>;
  }

  if (phase === "handoff_unavailable") {
    return <StatusBanner tone="error" title="Verification link unavailable">This verification link could not be confirmed. Return to Good Trouble and open a fresh link.</StatusBanner>;
  }

  return (
    <>
      <GoodTroublePrivacySequence phase={privacyPhase} />
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
            Confirm a different way
          </button>
        </div>
      )}

      {phase === "dob" && (
        <GoodTroublePurchaseDobForm
          busy={busy}
          error={error}
          onSubmit={(iso) => void submitDobAndQualify(iso)}
        />
      )}

      {phase === "under_21" && (
        <StatusBanner tone="info" title={GOOD_TROUBLE_PURCHASE_UNDER_21_TITLE}>
          {GOOD_TROUBLE_PURCHASE_UNDER_21_MESSAGE}
        </StatusBanner>
      )}

      {phase === "share" && verifyRequestId && (
        <GoodTroublePurchaseShareStep
          verifyRequestId={verifyRequestId}
          partnerId={partnerId}
          policyId={policyId}
          returnUrl={returnUrl}
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
