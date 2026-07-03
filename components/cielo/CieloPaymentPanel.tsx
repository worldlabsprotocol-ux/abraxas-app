"use client";
// FILE: components/cielo/CieloPaymentPanel.tsx
// Phase 2: manual digest verify · Phase 3: one-click pay from zkLogin wallet.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { payCieloFromWallet, verifyCieloPaymentOnServer } from "@/lib/cielo/payFromWallet";
import { consumerCopy } from "@/lib/consumerCopy";
import { NonCustodialDisclosure } from "@/components/compliance/NonCustodialDisclosure";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

interface BookingPayment {
  booking_id: string;
  status: string;
  est_usdc: number;
  check_in: string;
  check_out: string;
  paid: boolean;
  payment_tx_digest: string | null;
}

interface PaymentInfo {
  treasury_address: string | null;
  treasury_label: string;
  amount_usdc: number;
  memo: string;
  asset: string;
  payable: boolean;
  usdc_coin_type: string | null;
  network: string;
}

export function CieloPaymentPanel({
  bookingId,
  suiAddress: suiAddressProp,
}: {
  bookingId: string;
  suiAddress?: string | null;
}) {
  const { suiAddress: authAddress, isAuthenticated, canSignTransactions, signInWithGoogle } = useSuiAuth();
  const suiAddress = suiAddressProp ?? authAddress;

  const [booking, setBooking] = useState<BookingPayment | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [txDigest, setTxDigest] = useState("");
  const [busy, setBusy] = useState(false);
  const [payStep, setPayStep] = useState<"idle" | "signing" | "proving" | "submitting" | "verifying">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ explorer?: string | null } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const walletReady = Boolean(
    suiAddress &&
    isAuthenticated &&
    canSignTransactions,
  );

  useEffect(() => {
    fetch(`/api/cielo/booking?booking_id=${encodeURIComponent(bookingId)}`)
      .then(r => r.json())
      .then(d => {
        setBooking(d.booking ?? null);
        setPayment(d.payment ?? null);
      })
      .catch(() => setErr("Could not load booking"));
  }, [bookingId]);

  async function verifyPayment(digest: string) {
    setBusy(true);
    setErr(null);
    try {
      const result = await verifyCieloPaymentOnServer(bookingId, digest.trim());
      if (!result.ok) {
        throw new Error(result.error ?? "Verification failed");
      }
      setSuccess({ explorer: result.explorer });
      setBooking(prev => prev ? { ...prev, paid: true, status: "captured" } : prev);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
      setPayStep("idle");
    }
  }

  async function verifyManualPayment() {
    if (!txDigest.trim()) {
      setErr("Paste your Sui transaction digest");
      return;
    }
    await verifyPayment(txDigest.trim());
  }

  async function payNow() {
    if (!payment?.treasury_address || !suiAddress) {
      setErr("Connect your wallet and ensure treasury is configured");
      return;
    }
    if (!payment.payable) {
      setErr("This booking is not ready for payment yet");
      return;
    }

    setBusy(true);
    setErr(null);
    setPayStep("signing");

    try {
      setPayStep("proving");
      const { txDigest: digest } = await payCieloFromWallet({
        senderAddress: suiAddress,
        treasuryAddress: payment.treasury_address,
        amountUsdc: payment.amount_usdc,
        usdcCoinType: payment.usdc_coin_type,
      });

      setTxDigest(digest);
      setPayStep("verifying");
      await verifyPayment(digest);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Payment failed");
      setPayStep("idle");
      setBusy(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!booking || !payment) {
    return (
      <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>
        Loading payment details…
      </div>
    );
  }

  if (booking.paid || success) {
    return (
      <div style={{
        padding: "1rem", borderRadius: 14, background: `${ACCENT}10`,
        border: `1px solid ${ACCENT}44`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: ACCENT, marginBottom: "0.35rem" }}>
          Phase 3 · Pay from zkLogin · {payment.network ?? "sui"} verified on Sui
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.6 }}>
          Booking {booking.booking_id} is captured. Your stay is confirmed on the Abraxas Protocol Calendar.
        </p>
        {success?.explorer && (
          <a href={success.explorer} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT, marginRight: "0.75rem" }}>
            View transaction →
          </a>
        )}
        <a href={`/cielo/receipt?booking_id=${encodeURIComponent(booking.booking_id)}`}
          style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
          View on-chain receipt →
        </a>
      </div>
    );
  }

  const payLabel =
    payStep === "proving" ? "Generating proof…" :
    payStep === "signing" ? "Building transaction…" :
    payStep === "verifying" ? "Confirming payment…" :
    busy ? "Processing…" : `Pay ${payment.amount_usdc} ${payment.asset} now →`;

  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: "var(--surface)", border: `1px solid ${AMBER}44`,
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: AMBER,
                     letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        {consumerCopy.cielo.payBadge}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        {consumerCopy.cielo.payHeadline(payment.amount_usdc, payment.asset)} — asset settlement container
      </div>

      <div style={{ marginBottom: "0.85rem" }}>
        <NonCustodialDisclosure
          variant="compact"
          settlementNote="Booking payments route to the Cielo asset settlement address on Sui. Abraxas attests to payment state — it is not the counterparty or custodian."
        />
      </div>

      <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.85rem" }}>
        <Row label="Pay to" value={payment.treasury_address ?? payment.treasury_label}
          copyKey="treasury" copied={copied} onCopy={copy} mono />
        <Row label="Reference" value={payment.memo} copyKey="memo" copied={copied} onCopy={copy} mono />
        {suiAddress && showManual && (
          <Row label="Your wallet" value={suiAddress} copyKey="wallet" copied={copied} onCopy={copy} mono />
        )}
      </div>

      {!payment.payable && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: AMBER, margin: "0 0 0.75rem", lineHeight: 1.6 }}>
          Awaiting operator confirmation. You will receive a payment link once your dates are confirmed.
        </p>
      )}

      {payment.payable && walletReady && payment.treasury_address && (
        <>
          <button type="button" onClick={payNow} disabled={busy}
            style={{
              width: "100%", padding: "0.75rem", borderRadius: 999, border: "none",
              background: busy ? `${ACCENT}55` : ACCENT, color: "#000",
              fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, cursor: busy ? "wait" : "pointer",
              marginBottom: "0.65rem",
            }}>
            {payLabel}
          </button>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
            {consumerCopy.cielo.payHint}
          </p>
        </>
      )}

      {payment.payable && isAuthenticated && !walletReady && (
        <div style={{
          padding: "0.65rem 0.75rem", borderRadius: 10, marginBottom: "0.75rem",
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
        }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            Sign in again to enable one-click pay (session signing keys refresh on login).
          </p>
          <button type="button" onClick={() => signInWithGoogle()}
            style={{
              marginTop: "0.5rem", padding: "0.45rem 0.85rem", borderRadius: 999,
              border: `1px solid ${ACCENT}`, background: "transparent", color: ACCENT,
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
            }}>
            Refresh Google sign-in →
          </button>
        </div>
      )}

      {payment.payable && !isAuthenticated && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.75rem", lineHeight: 1.6 }}>
          <Link href="/passport" style={{ color: ACCENT, fontWeight: 600 }}>Sign in with Google</Link>{" "}
          to pay in one click.
        </p>
      )}

      {err && (
        <div style={{ color: "#EF4444", fontFamily: FONT, fontSize: "0.72rem", marginBottom: "0.5rem" }}>{err}</div>
      )}

      <button type="button" onClick={() => setShowManual(v => !v)}
        style={{
          background: "transparent", border: "none", padding: 0, cursor: "pointer",
          fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
        {showManual ? "Hide advanced options ▲" : "Paid another way? ▼"}
      </button>

      {showManual && (
        <div style={{ marginTop: "0.65rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
            Send from any compatible wallet, then paste the transaction reference below.
          </p>
          <label style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
            TRANSACTION REFERENCE
          </label>
          <input value={txDigest} onChange={e => setTxDigest(e.target.value)}
            placeholder="e.g. 8xK2…"
            style={{
              width: "100%", padding: "0.55rem 0.65rem", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--surface-raised)",
              color: "var(--text-primary)", fontFamily: MONO, fontSize: "0.75rem", boxSizing: "border-box",
              marginBottom: "0.65rem",
            }} />
          <button type="button" onClick={verifyManualPayment} disabled={busy}
            style={{
              width: "100%", padding: "0.55rem", borderRadius: 999,
              border: `1px solid ${ACCENT}66`, background: "transparent", color: ACCENT,
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: busy ? "wait" : "pointer",
            }}>
            Verify payment →
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  label, value, copyKey, copied, onCopy, mono,
}: {
  label: string;
  value: string;
  copyKey: string;
  copied: string | null;
  onCopy: (t: string, k: string) => void;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", minWidth: 72 }}>{label}</span>
      <code style={{
        flex: 1, fontFamily: mono ? MONO : FONT, fontSize: "0.68rem",
        color: "var(--text-secondary)", wordBreak: "break-all",
      }}>
        {value}
      </code>
      <button type="button" onClick={() => onCopy(value, copyKey)}
        style={{ border: "1px solid var(--border)", background: "transparent", borderRadius: 6,
          padding: "0.2rem 0.45rem", fontSize: "0.62rem", cursor: "pointer", color: "var(--text-muted)" }}>
        {copied === copyKey ? "✓" : "Copy"}
      </button>
    </div>
  );
}
