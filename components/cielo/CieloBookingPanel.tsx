"use client";
// FILE: components/cielo/CieloBookingPanel.tsx
// Book Cielo — USDC on Sui first; Apple Pay / card as convenience.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CIELO_RATES, blockedNightsInRange, estimateUsdc, eachNight } from "@/lib/cielo/bookingValidation";
import { NonCustodialDisclosure } from "@/components/compliance/NonCustodialDisclosure";
import { PaymentMethodChooser, type PaymentMethod } from "@/components/cielo/PaymentMethodChooser";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";
const RED = "#EF4444";

interface BlockedDate { start: string; end: string; }

type Step = "dates" | "verification" | "contact" | "done";

interface CheckLevelState {
  loading: boolean;
  needsDeepVerification: boolean;
  decision: string;
  missingClaims: string[];
}

export function CieloBookingPanel({
  suiAddress,
  variant = "button",
}: {
  suiAddress?: string | null;
  variant?: "button" | "inline";
}) {
  const [open, setOpen] = useState(variant === "inline");
  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wallet, setWallet] = useState(suiAddress ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [checkoutInfo, setCheckoutInfo] = useState<string[]>([]);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("crypto");
  const [verification, setVerification] = useState<CheckLevelState>({
    loading: false,
    needsDeepVerification: false,
    decision: "approved",
    missingClaims: [],
  });

  async function proceedFromDates() {
    setVerification(v => ({ ...v, loading: true }));
    setErr(null);
    try {
      if (!suiAddress && !wallet.trim()) {
        setVerification({
          loading: false,
          needsDeepVerification: true,
          decision: "manual_review",
          missingClaims: ["missing:account"],
        });
        setStep("verification");
        return;
      }

      if (suiAddress) {
        await fetch("/api/auth/browser-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sui_address: suiAddress }),
        }).catch(() => { /* best-effort */ });
      }

      const res = await fetch("/api/cielo/verified-rate/status", { credentials: "include" });
      const data = await res.json() as {
        evaluation?: {
          account_active?: boolean;
          profile_complete?: boolean;
          wallet_binding_active?: boolean;
          wallet_binding_fresh?: boolean;
          reason_codes?: string[];
        };
      };

      const ev = data.evaluation;
      const ready = Boolean(
        ev?.account_active && ev?.profile_complete && ev?.wallet_binding_active && ev?.wallet_binding_fresh,
      );

      setVerification({
        loading: false,
        needsDeepVerification: !ready,
        decision: ready ? "approved" : "manual_review",
        missingClaims: ev?.reason_codes ?? [],
      });
      setStep(ready ? "contact" : "verification");
    } catch {
      setVerification({ loading: false, needsDeepVerification: true, decision: "manual_review", missingClaims: ["policy_unavailable"] });
      setStep("verification");
      setErr("Eligibility check unavailable — complete Passport setup or try again.");
    }
  }

  useEffect(() => {
    setWallet(suiAddress ?? "");
  }, [suiAddress]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/cielo/availability")
      .then(r => r.json())
      .then(d => setBlocked((d.blocked ?? []) as BlockedDate[]))
      .catch(() => setBlocked([]));
  }, [open]);

  const nights = eachNight(checkIn, checkOut);
  const conflictNights = checkIn && checkOut ? blockedNightsInRange(checkIn, checkOut, blocked) : [];
  const est = estimateUsdc(checkIn, checkOut);

  async function submit() {
    if (!name.trim() || !email.trim() || !checkIn || !checkOut) {
      setErr("Name, email, and dates are required.");
      return;
    }
    if (conflictNights.length > 0) {
      setErr("Selected dates are blocked on the Abraxas Protocol Calendar.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/bookings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: "Cielo Sunrise · AAS-1",
          check_in: checkIn,
          check_out: checkOut,
          guests: parseInt(guests, 10),
          guest_name: name.trim(),
          email: email.trim(),
          wallet: wallet.trim() || null,
          sui_address: wallet.trim() || null,
          payment_chain: "sui",
          payment_asset: "USDC",
          notes: notes.trim() || null,
          nights: nights.length,
          est_usdc: est,
        }),
      });
      const data = await res.json() as { ok?: boolean; booking_id?: string; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Submission failed");
      }
      setRefId(data.booking_id ?? null);
      if (data.booking_id) {
        fetch("/api/cielo/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: data.booking_id, sui_address: wallet.trim() || null }),
        })
          .then(r => r.json())
          .then(c => {
            setCheckoutInfo((c.payment?.instructions ?? []) as string[]);
            setPayUrl((c as { pay_url?: string }).pay_url ?? null);
          })
          .catch(() => setCheckoutInfo([]));
      }
      setStep("done");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  const panel = (
    <div style={{
      background: "var(--surface-raised)",
      border: `1px solid ${AMBER}44`,
      borderRadius: variant === "inline" ? 16 : 14,
      overflow: "hidden",
      boxShadow: variant === "inline" ? "var(--shadow-glow)" : undefined,
    }}>
      <div style={{
        padding: "0.9rem 1.1rem",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem",
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: AMBER,
                         letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
            Book on Abraxas
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Settle in USDC on Sui
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
                       lineHeight: 1.55, margin: "0.35rem 0 0", maxWidth: 420 }}>
            Pick dates below. USDC settlement is live on Abraxas — Apple Pay or card available as convenience at checkout.
          </p>
        </div>
        {variant !== "inline" && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Close"
            style={{ border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-muted)", borderRadius: 8, padding: "0.25rem 0.5rem", cursor: "pointer" }}>
            ✕
          </button>
        )}
      </div>

      <div style={{ padding: "1rem 1.1rem" }}>
        {step === "dates" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.625rem" }}>
              <Field label="Check-in">
                <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                  style={inputStyle} />
              </Field>
              <Field label="Check-out">
                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                  style={inputStyle} />
              </Field>
            </div>
            <Field label="Guests">
              <select value={guests} onChange={e => setGuests(e.target.value)} style={inputStyle}>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(n => (
                  <option key={n} value={n}>{n} guest{parseInt(n, 10) > 1 ? "s" : ""}</option>
                ))}
              </select>
            </Field>

            {conflictNights.length > 0 && (
              <div style={{ marginTop: "0.75rem", padding: "0.65rem 0.75rem", borderRadius: 10,
                             background: `${RED}12`, border: `1px solid ${RED}33` }}>
                <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: RED, fontWeight: 600 }}>
                  Dates unavailable on Abraxas
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 4 }}>
                  {conflictNights.slice(0, 5).join(", ")}{conflictNights.length > 5 ? "…" : ""}
                </div>
              </div>
            )}

            {nights.length > 0 && conflictNights.length === 0 && (
              <>
                <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: 10,
                               background: `${AMBER}10`, border: `1px solid ${AMBER}30` }}>
                  <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: AMBER, letterSpacing: "0.08em" }}>
                    ESTIMATE
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    ~${est.toLocaleString()} USD
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
                    {nights.length} nights
                    {nights.length === 2 ? " · all fees included" : ` · from $${CIELO_RATES.weeknight}/night on Abraxas`}
                  </div>
                </div>
                <PaymentMethodChooser
                  amountUsdc={est}
                  suiAddress={wallet.trim() || suiAddress}
                  email={email.trim() || undefined}
                  phoneNumber={phone.trim() || undefined}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </>
            )}

            <button type="button" onClick={proceedFromDates}
              disabled={!checkIn || !checkOut || nights.length === 0 || conflictNights.length > 0 || verification.loading}
              style={primaryBtn(!checkIn || !checkOut || nights.length === 0 || conflictNights.length > 0 || verification.loading)}>
              {verification.loading ? "Checking eligibility…" : "Continue →"}
            </button>
          </>
        )}

        {step === "verification" && (
          <>
            <div style={{
              padding: "0.85rem", borderRadius: 12, marginBottom: "0.75rem",
              background: `${AMBER}12`, border: `1px solid ${AMBER}44`,
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: AMBER, marginBottom: "0.35rem" }}>
                Complete Tier 1 Passport first
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
                Cielo verified-rate pilot requires account, profile, and wallet binding — not identity verification.
                Policy <span style={{ fontFamily: MONO, fontSize: "0.62rem" }}>cielo-verified-guest-v1</span>.
              </p>
              {verification.missingClaims.length > 0 && (
                <ul style={{
                  margin: "0 0 0.65rem", paddingLeft: "1.1rem",
                  fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", lineHeight: 1.6,
                }}>
                  {verification.missingClaims.map(c => <li key={c}>{c.replace(/_/g, " ")}</li>)}
                </ul>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <Link href="/passport" style={{
                  display: "inline-block", padding: "0.5rem 0.9rem", borderRadius: 999,
                  background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700,
                  textDecoration: "none",
                }}>
                  Continue with basic Passport →
                </Link>
                <Link href="/cielo/verified-rate" style={{
                  fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT,
                  alignSelf: "center", textDecoration: "none",
                }}>
                  Check verified rate (pilot) →
                </Link>
              </div>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
              Identity verification is optional for this pilot. Add it later only if partner Trust Rules require Tier 2.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => setStep("dates")} style={ghostBtn}>← Back</button>
              <button type="button" onClick={proceedFromDates} style={{ ...ghostBtn, flex: 2, color: ACCENT, borderColor: `${ACCENT}55` }}>
                Re-check eligibility
              </button>
            </div>
          </>
        )}

        {step === "contact" && (
          <>
            <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-secondary)",
                         lineHeight: 1.65, margin: "0 0 0.875rem" }}>
              We confirm within 24 hours. You&apos;ll settle with{" "}
              {paymentMethod === "crypto" ? "USDC on Sui" : "Apple Pay / card (convenience)"} using the link we email.
              {!wallet.trim() && !suiAddress && (
                <>{" "}<Link href="/passport" style={{ color: ACCENT, fontWeight: 600 }}>Sign in with Google</Link> to pre-fill your wallet.</>
              )}
            </p>
            <Field label="Your name"><input value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></Field>
            <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} /></Field>
            <Field label="Phone (optional, for Apple Pay guest checkout)">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+14155551234" style={inputStyle} />
            </Field>
            <Field label="Payment wallet (optional)">
              <input value={wallet} onChange={e => setWallet(e.target.value)}
                placeholder="Filled automatically after sign-in" style={inputStyle} />
            </Field>
            <Field label="Notes">
              <textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            {err && <ErrorBox msg={err} />}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button type="button" onClick={() => setStep("dates")} style={ghostBtn}>← Back</button>
              <button type="button" onClick={submit} disabled={busy} style={primaryBtn(busy)}>
                {busy ? "Submitting…" : "Request booking →"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
            <div style={{ fontFamily: FONT, fontSize: "1.25rem", fontWeight: 800, color: ACCENT, marginBottom: "0.5rem" }}>
              Request received
            </div>
            {refId && (
              <>
                <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                  Ref: {refId}
                </div>
                <a href={`/cielo/status?booking_id=${encodeURIComponent(refId)}`} style={{
                  display: "inline-block", marginBottom: "0.75rem", padding: "0.5rem 1rem",
                  borderRadius: 999, border: "1px solid var(--border)", color: "var(--text-secondary)",
                  fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, textDecoration: "none",
                }}>
                  Track booking status →
                </a>
              </>
            )}
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
              Your dates are on the live calendar. Once confirmed, settle in USDC on Sui — or use Apple Pay / card if you prefer.
            </p>
            {refId && est > 0 && (
              <div style={{ marginBottom: "1rem", textAlign: "left" }}>
                <PaymentMethodChooser
                  amountUsdc={est}
                  suiAddress={wallet.trim() || suiAddress}
                  bookingId={refId}
                  email={email.trim() || undefined}
                  phoneNumber={phone.trim() || undefined}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </div>
            )}
            <div style={{ marginBottom: "1rem" }}>
              <NonCustodialDisclosure variant="compact" />
            </div>
            {payUrl && (
              <a href={payUrl} style={{
                display: "inline-block", marginBottom: "1rem", padding: "0.65rem 1.25rem",
                borderRadius: 999, background: paymentMethod === "fiat" ? "#000" : AMBER,
                color: paymentMethod === "fiat" ? "#fff" : "#000",
                fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, textDecoration: "none",
              }}>
                {paymentMethod === "fiat" ? "Pay with Apple Pay / card →" : "Continue to USDC payment →"}
              </a>
            )}
            {checkoutInfo.length > 0 && (
              <ul style={{ textAlign: "left", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
                            lineHeight: 1.65, margin: "0 0 1rem", paddingLeft: "1.1rem" }}>
                {checkoutInfo.map(line => <li key={line}>{line}</li>)}
              </ul>
            )}
            {variant !== "inline" && (
              <button type="button" onClick={() => { setOpen(false); setStep("dates"); }} style={primaryBtn(false)}>
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "inline") return panel;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{
        padding: "0.75rem 1.5rem", borderRadius: 8, border: "none",
        background: AMBER, color: "#000", fontFamily: FONT, fontSize: "0.85rem",
        fontWeight: 700, cursor: "pointer",
      }}>
        Book your stay →
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(2,4,8,0.88)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "1.5rem 1rem", overflowY: "auto",
        }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.625rem" }}>
      <label style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, color: "var(--text-muted)",
                       letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: "0.5rem 0.65rem", borderRadius: 8, background: `${RED}10`,
                  border: `1px solid ${RED}33`, color: RED, fontFamily: FONT, fontSize: "0.72rem" }}>
      {msg}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.65rem", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-primary)", fontFamily: FONT, fontSize: "16px", boxSizing: "border-box",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%", marginTop: "0.75rem", padding: "0.65rem 1rem", borderRadius: 999,
    border: "none", background: disabled ? `${ACCENT}55` : ACCENT, color: "#000",
    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const ghostBtn: React.CSSProperties = {
  flex: 1, padding: "0.65rem", borderRadius: 999, border: "1px solid var(--border)",
  background: "transparent", color: "var(--text-muted)", fontFamily: FONT,
  fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
};
