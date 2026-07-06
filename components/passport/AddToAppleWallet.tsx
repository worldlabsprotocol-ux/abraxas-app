"use client";
// FILE: components/passport/AddToAppleWallet.tsx

import { useState } from "react";
import { AddToAppleWalletButton } from "@/components/ui/AddToAppleWalletButton";

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
  const [preview, setPreview] = useState<boolean>(false);

  async function requestPass() {
    if (!suiAddress) {
      setMsg("Sign in with Google first to generate your passport pass.");
      return;
    }

    setBusy(true);
    setMsg(null);
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
        passPreview?: unknown;
      };

      if (data.configured && data.ok) {
        setMsg("Pass signing is configured. Download will be enabled once .pkpass emission is wired.");
        setPreview(true);
        return;
      }

      setPreview(true);
      setMsg(
        data.message ??
        "Apple Wallet integration is in setup. Your credential is still verifiable at /verify.",
      );
    } catch {
      setMsg("Could not reach wallet pass service.");
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
        Apple Wallet
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
        color: "var(--text-primary)", margin: "0 0 0.35rem",
      }}>
        Keep your verified status in Apple Wallet — scan anywhere
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
        lineHeight: 1.6, margin: "0 0 0.75rem",
      }}>
        Carry your verified Passport like a boarding pass — QR links to the public verifier.
      </p>

      <AddToAppleWalletButton onClick={requestPass} busy={busy} variant="dark" size="md">
        Add to Apple Wallet
      </AddToAppleWalletButton>

      {msg && (
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
          lineHeight: 1.55, margin: "0.75rem 0 0",
        }}>
          {msg}
        </p>
      )}

      {preview && (
        <p style={{
          fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
          margin: "0.5rem 0 0", lineHeight: 1.5,
        }}>
          Requires Apple Developer Pass Type ID + signing certs. Until then, share your credential at{" "}
          <a href="/verify" style={{ color: ACCENT }}>/verify</a>.
        </p>
      )}
    </div>
  );
}
