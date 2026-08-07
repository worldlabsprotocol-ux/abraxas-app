"use client";
// FILE: app/examples/partner-access-starter/callback/CallbackClient.tsx
// Partner callback — frozen params only; server verifies receipt (no PII in browser storage).

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { validateCallbackSearchParams } from "@/examples/partner-access-nextjs-starter/lib/callbackParams";
import {
  STARTER_LABEL,
  STARTER_ROUTES,
} from "@/examples/partner-access-nextjs-starter/lib/constants";

export function CallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Validating callback…");

  useEffect(() => {
    const validation = validateCallbackSearchParams(searchParams);
    if (!validation.ok || !validation.params) {
      setError(validation.errors.join(", "));
      setStatus("Callback rejected.");
      return;
    }

    if (validation.params.status === "denied") {
      setError("Verification was denied.");
      setStatus("Access not granted.");
      return;
    }

    const receiptId = validation.params.receipt_id!;
    setStatus("Verifying receipt server-side…");

    void fetch(STARTER_ROUTES.verifyApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt_id: receiptId }),
      credentials: "same-origin",
    })
      .then(async (res) => {
        const data = (await res.json()) as { code?: string; message?: string };
        if (!res.ok) {
          throw new Error(data.message ?? data.code ?? "verification_failed");
        }
        router.replace(STARTER_ROUTES.protected);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Verification failed.");
        setStatus("Could not grant access.");
      });
  }, [searchParams, router]);

  return (
    <main style={{ fontFamily: "system-ui,sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <p style={{ color: "#b45309", fontSize: "0.875rem" }}>{STARTER_LABEL}</p>
      <h1>Partner callback</h1>
      <p>{status}</p>
      {error && (
        <>
          <p style={{ color: "#dc2626" }}>{error}</p>
          <p style={{ marginTop: "1rem" }}>
            <a href={STARTER_ROUTES.entry}>Re-verify with Abraxas</a>
          </p>
        </>
      )}
    </main>
  );
}
