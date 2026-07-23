"use client";
// FILE: components/cielo/CieloBookingPanel.tsx
// Book Cielo. institutional multi-step flow (dates → passport → contact → done).

import { useEffect, useState } from "react";
import Link from "next/link";
import { CIELO_RATES, blockedNightsInRange, estimateUsdc, eachNight } from "@/lib/cielo/bookingValidation";
import { NonCustodialDisclosure } from "@/components/compliance/NonCustodialDisclosure";
import { PaymentMethodChooser, type PaymentMethod } from "@/components/cielo/PaymentMethodChooser";
import { Btn } from "@/components/redesign/ui";
import {
  CIELO_FONT,
  CIELO_MONO,
  CIELO_VERIFY,
  CIELO_BLOCKED,
  cieloPanelStyle,
  cieloInputStyle,
  cieloEyebrowStyle,
} from "./cieloBookingStyles";

interface BlockedDate { start: string; end: string; }

type Step = "dates" | "verification" | "contact" | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "dates", label: "Dates" },
  { id: "verification", label: "Passport" },
  { id: "contact", label: "Details" },
  { id: "done", label: "Done" },
];

interface CheckLevelState {
  loading: boolean;
  needsDeepVerification: boolean;
  decision: string;
  missingClaims: string[];
}

export function CieloBookingPanel({
  suiAddress,
  variant = "button",
  checkIn: controlledCheckIn,
  checkOut: controlledCheckOut,
  onDatesChange,
}: {
  suiAddress?: string | null;
  variant?: "button" | "inline";
  checkIn?: string;
  checkOut?: string;
  onDatesChange?: (checkIn: string, checkOut: string) => void;
}) {
  const [open, setOpen] = useState(variant === "inline");
  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState(controlledCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(controlledCheckOut ?? "");
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("fiat");
  const [verification, setVerification] = useState<CheckLevelState>({
    loading: false,
    needsDeepVerification: false,
    decision: "approved",
    missingClaims: [],
  });

  useEffect(() => {
    if (controlledCheckIn !== undefined) setCheckIn(controlledCheckIn);
  }, [controlledCheckIn]);

  useEffect(() => {
    if (controlledCheckOut !== undefined) setCheckOut(controlledCheckOut);
  }, [controlledCheckOut]);

  function updateDates(ci: string, co: string) {
    setCheckIn(ci);
    setCheckOut(co);
    onDatesChange?.(ci, co);
  }

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
      setErr("Eligibility check unavailable. complete Passport setup or try again.");
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
      setErr("Selected dates are blocked on the Protocol Calendar.");
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
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Submission failed");
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
    <div className="abx-glass-panel" style={cieloPanelStyle}>
      <div style={{ padding: "1.15rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
        <div style={cieloEyebrowStyle}>Reserve on Abraxas</div>
        <h3 style={{
          fontFamily: CIELO_FONT,
          fontSize: "var(--fs-h2, 1.05rem)",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 0.35rem",
        }}>
          Request your stay
        </h3>
        <p style={{
          fontFamily: CIELO_FONT,
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          margin: 0,
        }}>
          Pick dates on the calendar or below. Pay with Apple Pay / card after operator confirmation.
        </p>
        {variant !== "inline" && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Close"
            style={{
              position: "absolute", top: 12, right: 12,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-muted)", borderRadius: 8, padding: "0.25rem 0.5rem", cursor: "pointer",
            }}>
            ✕
          </button>
        )}
      </div>

      <StepIndicator current={step} />

      <div style={{ padding: "1.15rem 1.25rem" }}>
        {step === "dates" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "0.65rem" }}>
              <Field label="Check-in">
                <input type="date" value={checkIn}
                  onChange={e => updateDates(e.target.value, checkOut)}
                  style={cieloInputStyle} />
              </Field>
              <Field label="Check-out">
                <input type="date" value={checkOut}
                  onChange={e => updateDates(checkIn, e.target.value)}
                  style={cieloInputStyle} />
              </Field>
            </div>
            <Field label="Guests">
              <select value={guests} onChange={e => setGuests(e.target.value)} style={cieloInputStyle}>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(n => (
                  <option key={n} value={n}>{n} guest{parseInt(n, 10) > 1 ? "s" : ""}</option>
                ))}
              </select>
            </Field>

            {conflictNights.length > 0 && (
              <div style={{
                marginTop: "0.75rem", padding: "0.75rem", borderRadius: 12,
                background: "rgba(239,68,68,0.1)", border: `1px solid ${CIELO_BLOCKED}44`,
              }}>
                <div style={{ fontFamily: CIELO_FONT, fontSize: "0.8rem", color: CIELO_BLOCKED, fontWeight: 600 }}>
                  Dates unavailable on Protocol Calendar
                </div>
                <div style={{ fontFamily: CIELO_MONO, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 4 }}>
                  {conflictNights.slice(0, 5).join(", ")}{conflictNights.length > 5 ? "…" : ""}
                </div>
              </div>
            )}

            {nights.length > 0 && conflictNights.length === 0 && (
              <div style={{
                marginTop: "0.85rem",
                padding: "1rem",
                borderRadius: 14,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}>
                <div style={{ fontFamily: CIELO_MONO, fontSize: "0.58rem", color: "var(--accent)", letterSpacing: "0.08em", marginBottom: 4 }}>
                  ESTIMATE
                </div>
                <div style={{ fontFamily: CIELO_FONT, fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  ~${est.toLocaleString()} USD
                </div>
                <div style={{ fontFamily: CIELO_FONT, fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {nights.length} night{nights.length > 1 ? "s" : ""} · from ${CIELO_RATES.weeknight}/night on Abraxas
                </div>
                <div style={{ marginTop: "0.85rem" }}>
                  <PaymentMethodChooser
                    amountUsdc={est}
                    suiAddress={wallet.trim() || suiAddress}
                    email={email.trim() || undefined}
                    phoneNumber={phone.trim() || undefined}
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    compact
                  />
                </div>
              </div>
            )}

            {err && <ErrorBox msg={err} />}
            <Btn
              onClick={proceedFromDates}
              disabled={!checkIn || !checkOut || nights.length === 0 || conflictNights.length > 0 || verification.loading}
              loading={verification.loading}
              fullWidth
              size="lg"
              style={{ marginTop: "1rem" }}
            >
              {verification.loading ? "Checking eligibility…" : "Continue →"}
            </Btn>
          </>
        )}

        {step === "verification" && (
          <>
            <div style={{
              padding: "1rem", borderRadius: 14, marginBottom: "0.85rem",
              background: "rgba(232,197,71,0.08)", border: "1px solid var(--accent-border, rgba(232,197,71,0.35))",
            }}>
              <div style={{ fontFamily: CIELO_FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--accent)", marginBottom: "0.35rem" }}>
                Complete Tier 1 Passport
              </div>
              <p style={{ fontFamily: CIELO_FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.5rem" }}>
                Verified-rate pilot requires account, profile, and wallet binding. not identity verification.
                Policy <span style={{ fontFamily: CIELO_MONO, fontSize: "0.62rem" }}>cielo-verified-guest-v1</span>.
              </p>
              {verification.missingClaims.length > 0 && (
                <ul style={{
                  margin: "0 0 0.75rem", paddingLeft: "1.1rem",
                  fontFamily: CIELO_MONO, fontSize: "0.62rem", color: "var(--text-muted)", lineHeight: 1.7,
                }}>
                  {verification.missingClaims.map(c => <li key={c}>{c.replace(/_/g, " ")}</li>)}
                </ul>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <Btn href="/passport" size="sm">Continue with Passport →</Btn>
                <Btn href="/cielo/verified-rate" variant="ghost" size="sm">Check verified rate</Btn>
              </div>
            </div>
            <p style={{ fontFamily: CIELO_FONT, fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.85rem" }}>
              Identity verification is optional for this pilot.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Btn onClick={() => setStep("dates")} variant="secondary" size="md" style={{ flex: 1 }}>← Back</Btn>
              <Btn onClick={proceedFromDates} variant="primary" size="md" style={{ flex: 2 }}>Re-check eligibility</Btn>
            </div>
          </>
        )}

        {step === "contact" && (
          <>
            <p style={{ fontFamily: CIELO_FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
              lineHeight: 1.65, margin: "0 0 0.875rem" }}>
              We confirm within 24 hours. You&apos;ll pay with{" "}
              {paymentMethod === "fiat" ? "Apple Pay / card" : "existing balance"} using the link we email.
              {!wallet.trim() && !suiAddress && (
                <>{" "}<Link href="/passport" style={{ color: CIELO_VERIFY, fontWeight: 600 }}>Sign in with Google</Link> to pre-fill your wallet.</>
              )}
            </p>
            <Field label="Your name"><input value={name} onChange={e => setName(e.target.value)} style={cieloInputStyle} /></Field>
            <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={cieloInputStyle} /></Field>
            <Field label="Phone (optional)">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+14155551234" style={cieloInputStyle} />
            </Field>
            <Field label="Payment wallet (optional)">
              <input value={wallet} onChange={e => setWallet(e.target.value)}
                placeholder="Filled automatically after sign-in" style={cieloInputStyle} />
            </Field>
            <Field label="Notes">
              <textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)}
                style={{ ...cieloInputStyle, resize: "vertical" }} />
            </Field>
            {err && <ErrorBox msg={err} />}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem" }}>
              <Btn onClick={() => setStep("dates")} variant="secondary" size="md" style={{ flex: 1 }}>← Back</Btn>
              <Btn onClick={submit} loading={busy} disabled={busy} size="md" style={{ flex: 2 }}>
                Request booking →
              </Btn>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "0.25rem 0" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", margin: "0 auto 0.75rem",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.25rem", color: CIELO_VERIFY,
            }}>
              ✓
            </div>
            <div style={{ fontFamily: CIELO_FONT, fontSize: "1.2rem", fontWeight: 800, color: CIELO_VERIFY, marginBottom: "0.5rem" }}>
              Request received
            </div>
            {refId && (
              <>
                <div style={{ fontFamily: CIELO_MONO, fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                  Ref: {refId}
                </div>
                <Btn href={`/cielo/status?booking_id=${encodeURIComponent(refId)}`} variant="secondary" size="sm" style={{ marginBottom: "0.85rem" }}>
                  Track booking status →
                </Btn>
              </>
            )}
            <p style={{ fontFamily: CIELO_FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
              Your dates are on the live calendar. Once confirmed, pay with Apple Pay or your card.
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
              <Btn href={payUrl} newTab size="lg" fullWidth style={{ marginBottom: "1rem" }}>
                {paymentMethod === "fiat" ? "Pay with Apple Pay / card →" : "Continue to payment →"}
              </Btn>
            )}
            {checkoutInfo.length > 0 && (
              <ul style={{
                textAlign: "left", fontFamily: CIELO_FONT, fontSize: "0.74rem", color: "var(--text-muted)",
                lineHeight: 1.65, margin: "0 0 1rem", paddingLeft: "1.1rem",
              }}>
                {checkoutInfo.map(line => <li key={line}>{line}</li>)}
              </ul>
            )}
            {variant !== "inline" && (
              <Btn onClick={() => { setOpen(false); setStep("dates"); }} fullWidth>
                Close
              </Btn>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "inline") return panel;

  return (
    <>
      <Btn onClick={() => setOpen(true)} size="lg">
        Book your stay →
      </Btn>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(2,4,8,0.88)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "1.5rem 1rem", overflowY: "auto",
        }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, position: "relative" }}>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex(s => s.id === current);
  return (
    <div style={{
      display: "flex",
      gap: 0,
      padding: "0.75rem 1.25rem",
      borderBottom: "1px solid var(--border)",
      background: "var(--surface)",
    }}>
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: CIELO_MONO, fontSize: "0.62rem", fontWeight: 700,
              background: done ? CIELO_VERIFY : active ? "var(--accent)" : "var(--surface-raised)",
              color: done || active ? "#0A0814" : "var(--text-muted)",
              border: active ? "none" : "1px solid var(--border)",
            }}>
              {done ? "✓" : i + 1}
            </div>
            <span style={{
              fontFamily: CIELO_FONT,
              fontSize: "0.62rem",
              fontWeight: active ? 700 : 500,
              color: active ? "var(--text-primary)" : "var(--text-muted)",
            }}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.65rem" }}>
      <label style={{
        fontFamily: CIELO_MONO, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)",
        letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "0.3rem",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      marginTop: "0.75rem", padding: "0.65rem 0.85rem", borderRadius: 10,
      background: "rgba(239,68,68,0.1)", border: `1px solid ${CIELO_BLOCKED}44`,
      color: CIELO_BLOCKED, fontFamily: CIELO_FONT, fontSize: "0.76rem",
    }}>
      {msg}
    </div>
  );
}
