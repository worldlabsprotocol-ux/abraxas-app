"use client";
// FILE: components/passport/PassportIntentCard.tsx
// Quick security check after sign-in — no payment required.

import { useState } from "react";
import { loadEphemeralSecretKey } from "@/lib/sui/zklogin/session";
import { signIntentMessage } from "@/lib/sui/intent/personalMessage";
import { consumerCopy } from "@/lib/consumerCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function PassportIntentCard({
  suiAddress,
}: {
  suiAddress: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "signing" | "verified" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!suiAddress) return null;

  async function proveControl() {
    if (!suiAddress) return;
    setStatus("signing");
    setError(null);

    const secretKey = loadEphemeralSecretKey();
    if (!secretKey) {
      setStatus("error");
      setError("Sign out and sign in again with Google to enable this check for your session.");
      return;
    }

    try {
      const challengeRes = await fetch("/api/intent/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress }),
      });
      const challenge = await challengeRes.json() as {
        challenge_id?: string;
        message?: string;
        error?: string;
      };
      if (!challengeRes.ok || !challenge.challenge_id || !challenge.message) {
        throw new Error(challenge.error ?? "Could not create challenge");
      }

      const { signature, publicKey } = await signIntentMessage(challenge.message, secretKey);

      const verifyRes = await fetch("/api/intent/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.challenge_id,
          signature,
          public_key: publicKey,
        }),
      });
      const result = await verifyRes.json() as { verified?: boolean; error?: string };
      if (!verifyRes.ok || !result.verified) {
        throw new Error(result.error ?? "Verification failed");
      }

      setStatus("verified");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Security check failed");
    }
  }

  const copy = consumerCopy.intent;

  return (
    <div style={{
      background: "var(--surface-raised)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "1.25rem 1.35rem", marginBottom: "1.5rem",
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        Security
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
        {copy.title}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
        {copy.body}
      </p>

      {status === "verified" ? (
        <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600, color: ACCENT }}>
          {copy.verified}
        </div>
      ) : (
        <button type="button" onClick={proveControl} disabled={status === "signing"}
          style={{
            padding: "0.65rem 1.25rem", borderRadius: 999, border: "none",
            background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.82rem",
            fontWeight: 700, cursor: status === "signing" ? "wait" : "pointer",
            opacity: status === "signing" ? 0.7 : 1,
          }}>
          {status === "signing" ? "Confirming…" : copy.cta}
        </button>
      )}

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", marginTop: "0.75rem", marginBottom: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
