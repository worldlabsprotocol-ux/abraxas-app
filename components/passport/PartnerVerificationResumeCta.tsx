"use client";
// FILE: components/passport/PartnerVerificationResumeCta.tsx
// Single Passport action when automatic Partner Flow resume cannot run.

import { useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { isRestorablePartnerContinuePath } from "@/lib/partner/partnerFlowContinuation";

export function PartnerVerificationResumeCta() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/partner-verify/resume", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json() as { hasContinuation?: boolean; action?: string };
        if (!cancelled && data.hasContinuation && data.action === "return_to_partner_verification") {
          setVisible(true);
        }
      })
      .catch(() => {
        // Stay hidden when peek fails closed.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
              const data = await res.json() as { ok?: boolean; continuePath?: string };
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
