"use client";
// FILE: components/passport/AddToAppleWallet.tsx

import Link from "next/link";
import { useState } from "react";
import { AddToAppleWalletButton } from "@/components/ui/AddToAppleWalletButton";
import { Btn } from "@/components/redesign/ui";
import {
  APPLE_WALLET_BODY,
  APPLE_WALLET_EYEBROW,
  APPLE_WALLET_FETCH_ERROR,
  APPLE_WALLET_HEADLINE,
  APPLE_WALLET_RETRY_LABEL,
  HOLDER_VERIFY_CREDENTIAL_PATH,
  HOLDER_VERIFY_DEFAULT_PATH,
} from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function AddToAppleWallet({
  suiAddress,
  verificationLevel,
  assetName,
  credentialId,
}: {
  suiAddress: string | null;
  verificationLevel?: string;
  assetName?: string;
  credentialId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  async function requestPass() {
    if (!suiAddress) {
      setMsg("Sign in with Google first to use Passport tools.");
      return;
    }

    setBusy(true);
    setMsg(null);
    setFetchFailed(false);
    try {
      const params = new URLSearchParams({ sui: suiAddress });
      if (verificationLevel) params.set("level", verificationLevel);
      if (assetName) params.set("asset", assetName);
      if (credentialId) params.set("credentialId", credentialId);

      const res = await fetch(`/api/wallet-pass?${params}`);
      const data = await res.json() as {
        ok?: boolean;
        configured?: boolean;
        message?: string;
      };

      if (data.configured && data.ok) {
        setMsg(APPLE_WALLET_HEADLINE);
        return;
      }

      setMsg(data.message ?? APPLE_WALLET_HEADLINE);
    } catch {
      setFetchFailed(true);
      setMsg(APPLE_WALLET_FETCH_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (!suiAddress) return null;

  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.35rem",
      }}>
        {APPLE_WALLET_EYEBROW}
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
        color: "var(--text-primary)", margin: "0 0 0.35rem",
      }}>
        {APPLE_WALLET_HEADLINE}
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
        lineHeight: 1.6, margin: "0 0 0.75rem",
      }}>
        {APPLE_WALLET_BODY}
      </p>

      <AddToAppleWalletButton onClick={() => void requestPass()} busy={busy} variant="dark" size="md">
        Add to Apple Wallet
      </AddToAppleWalletButton>

      {msg && (
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
          lineHeight: 1.55, margin: "0.75rem 0 0",
        }} role={fetchFailed ? "alert" : "status"}>
          {msg}
        </p>
      )}

      {fetchFailed && (
        <div style={{ marginTop: "0.65rem" }}>
          <Btn size="sm" variant="secondary" loading={busy} onClick={() => void requestPass()}>
            {APPLE_WALLET_RETRY_LABEL}
          </Btn>
        </div>
      )}

      <p style={{
        fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
        margin: "0.75rem 0 0", lineHeight: 1.5,
      }}>
        <Link href={HOLDER_VERIFY_DEFAULT_PATH} style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
          My records &amp; credentials
        </Link>
        {" · "}
        <Link href={HOLDER_VERIFY_CREDENTIAL_PATH} style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
          Test credential JWT
        </Link>
      </p>
    </div>
  );
}
