"use client";
// FILE: components/passport/PartnerVerificationResumeCta.tsx
// Server-backed resume action, or a recoverable store-unavailable message.

import { useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { CONTINUATION_STORE_UNAVAILABLE } from "@/lib/partner/partnerFlowContinuation";
import { PARTNER_CONTINUATION_STORE_UNAVAILABLE_MESSAGE } from "@/lib/partner/partnerContinuationCopy";
import { isRestorablePartnerContinuePath } from "@/lib/partner/partnerFlowContinuation";

export function PartnerVerificationResumeCta() {
  const [visible, setVisible] = useState(false);
  const [storeUnavailable, setStoreUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/partner-verify/resume", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json() as {
          hasContinuation?: boolean;
          action?: string;
          code?: string;
        };
        if (cancelled) return;
        if (data.code === CONTINUATION_STORE_UNAVAILABLE || res.status === 503) {
          setStoreUnavailable(true);
          setVisible(false);
          return;
        }
        if (data.hasContinuation && data.action === "return_to_partner_verification") {
          setVisible(true);
        }
      })
      .catch(() => {
        // Peek network failure is not a store-unavailable signal.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (storeUnavailable) {
    return (
      <div style={{ margin: "0 0 1rem" }} role="status">
        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
          {PARTNER_CONTINUATION_STORE_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div style={{ margin: "0 0 1rem" }}>
      <Btn
        size="lg"
        fullWidth
        loading={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void fetch("/api/v1/partner-verify/resume/activate", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })
            .then(async (res) => {
              const data = await res.json() as {
                ok?: boolean;
                continuePath?: string;
                code?: string;
              };
              if (data.code === CONTINUATION_STORE_UNAVAILABLE || res.status === 503) {
                setVisible(false);
                setStoreUnavailable(true);
                return;
              }
              if (
                res.ok
                && data.ok
                && typeof data.continuePath === "string"
                && isRestorablePartnerContinuePath(data.continuePath)
              ) {
                window.location.assign(data.continuePath);
                return;
              }
              setVisible(false);
              setError("This partner verification can no longer be resumed.");
            })
            .catch(() => {
              setError("This partner verification can no longer be resumed.");
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        Return to partner verification
      </Btn>
      {error ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#B45309" }}>{error}</p>
      ) : null}
    </div>
  );
}
