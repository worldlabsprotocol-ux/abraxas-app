"use client";
// FILE: components/portal/OwnerSettlementPanel.tsx
// USDC settlement for deal-ready owner applications (Cielo rail, generalized).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { payCieloFromWallet } from "@/lib/cielo/payFromWallet";
import { fetchCheckLevel } from "@/lib/api/passport";
import { VerificationGatePrompt } from "@/components/verification/VerificationGatePrompt";
import { NonCustodialDisclosure } from "@/components/compliance/NonCustodialDisclosure";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface PaymentInfo {
  amount_usdc: number;
  treasury_address: string | null;
  treasury_label: string;
  usdc_coin_type: string | null;
  asset: string;
  memo: string;
  network?: string;
}

export function OwnerSettlementPanel({
  applicationId,
  email,
}: {
  applicationId: string;
  email: string;
}) {
  const { suiAddress, isAuthenticated, canSignTransactions, signInWithGoogle } = useSuiAuth();
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [assetName, setAssetName] = useState("");
  const [busy, setBusy] = useState(false);
  const [payStep, setPayStep] = useState<"idle" | "signing" | "verifying">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ explorer?: string | null } | null>(null);
  const [verification, setVerification] = useState({
    loading: false,
    checked: false,
    needsDeepVerification: false,
    missingClaims: [] as string[],
  });

  const walletReady = Boolean(suiAddress && isAuthenticated && canSignTransactions);

  useEffect(() => {
    fetch("/api/portal/settlement/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: applicationId, email }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.payment) {
          setPayment(d.payment);
          setAssetName(d.asset_name ?? "");
        } else {
          setErr(d.error ?? "Settlement not available");
        }
      })
      .catch(() => setErr("Could not prepare settlement"));
  }, [applicationId, email]);

  useEffect(() => {
    if (!suiAddress || !payment) return;
    setVerification(v => ({ ...v, loading: true }));
    fetchCheckLevel("high_value_transaction", suiAddress)
      .then(r => setVerification({
        loading: false,
        checked: true,
        needsDeepVerification: r.needsDeepVerification,
        missingClaims: r.missing_claims ?? [],
      }))
      .catch(() => setVerification(v => ({ ...v, loading: false, checked: true })));
  }, [suiAddress, payment]);

  async function pay() {
    if (!payment?.treasury_address || !suiAddress) return;
    setPayStep("signing");
    setErr(null);
    try {
      const { txDigest } = await payCieloFromWallet({
        senderAddress: suiAddress,
        treasuryAddress: payment.treasury_address,
        amountUsdc: payment.amount_usdc,
        usdcCoinType: payment.usdc_coin_type,
      });
      setPayStep("verifying");
      const res = await fetch("/api/portal/settlement/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, email, tx_digest: txDigest }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; verification?: { explorer_url?: string } };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Verification failed");
      setSuccess({ explorer: data.verification?.explorer_url });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPayStep("idle");
    }
  }

  if (!payment && !err) {
    return <div style={shell}>Preparing USDC settlement…</div>;
  }

  if (success) {
    return (
      <div style={shell}>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: ACCENT, fontWeight: 700, marginBottom: "0.35rem" }}>
          SETTLED ON SUI
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
          {payment?.amount_usdc} USDC captured
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Verified on-chain against Abraxas treasury — same rail as Cielo bookings.
        </p>
        {success.explorer && (
          <a href={success.explorer} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>
            View transaction →
          </a>
        )}
        <div style={{ marginTop: "0.75rem" }}>
          <Link href={`/portal/journey?application_id=${encodeURIComponent(applicationId)}&email=${encodeURIComponent(email)}`}
            style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
            ← Back to journey
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: ACCENT, fontWeight: 700, marginBottom: "0.35rem" }}>
        USDC SETTLEMENT · SUI
      </div>
      <h2 style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, margin: "0 0 0.35rem" }}>
        {assetName || "Owner settlement"}
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 1rem", lineHeight: 1.6 }}>
        Circle USDC on Sui — one click from your Passport wallet. Verification gate runs before capture, same as Cielo.
      </p>

      <div style={{
        padding: "0.75rem", borderRadius: 10, background: "var(--surface-raised)",
        border: "1px solid var(--border)", marginBottom: "0.85rem",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 900, color: ACCENT }}>
          {payment?.amount_usdc} USDC
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {payment?.asset} · memo {payment?.memo}
        </div>
      </div>

      <NonCustodialDisclosure variant="compact" />

      {!walletReady && (
        <button type="button" onClick={() => void signInWithGoogle()} style={btn(false)}>
          Sign in to pay →
        </button>
      )}

      {walletReady && verification.checked && verification.needsDeepVerification && (
        <VerificationGatePrompt
          actionLabel="high-value settlement"
          missingClaims={verification.missingClaims}
        />
      )}

      {walletReady && verification.checked && !verification.needsDeepVerification && payment?.treasury_address && (
        <button type="button" onClick={() => void pay()} disabled={payStep !== "idle"} style={btn(payStep !== "idle")}>
          {payStep === "signing" ? "Confirm in wallet…" : payStep === "verifying" ? "Verifying on-chain…" : `Pay ${payment.amount_usdc} USDC →`}
        </button>
      )}

      {err && <p style={{ color: "#EF4444", fontFamily: FONT, fontSize: "0.72rem", marginTop: "0.5rem" }}>{err}</p>}
    </div>
  );
}

const shell: React.CSSProperties = {
  padding: "1rem", borderRadius: 14,
  background: "var(--surface)", border: "1px solid var(--border)",
};

function btn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%", marginTop: "0.75rem", padding: "0.65rem", borderRadius: 999, border: "none",
    background: disabled ? `${ACCENT}55` : ACCENT, color: "#000",
    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, cursor: disabled ? "wait" : "pointer",
  };
}
