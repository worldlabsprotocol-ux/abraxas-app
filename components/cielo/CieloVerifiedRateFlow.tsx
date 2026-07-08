"use client";
// FILE: components/cielo/CieloVerifiedRateFlow.tsx
// Step 3 closed loop — Passport → consent → eligibility → pilot booking request.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { eachNight, estimateUsdc } from "@/lib/cielo/bookingValidation";
import type { CieloVerifiedGuestEvaluation } from "@/lib/cielo/verifiedGuestPolicy";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";
const RED = "#EF4444";

type FlowStep = "passport" | "consent" | "submit" | "done";

interface ConsentResult {
  consent_receipt_id: string;
  verification_decision_id: string;
  decision: string;
  display_decision: string;
  reason_codes: string[];
}

const RETURN_PATH = "/cielo/verified-rate";

async function ensureBrowserSession(suiAddress: string): Promise<void> {
  await fetch("/api/auth/browser-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sui_address: suiAddress }),
  }).catch(() => { /* best-effort */ });
}

export function CieloVerifiedRateFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { suiAddress, isAuthenticated, signInWithGoogle } = useSuiAuth();

  const [step, setStep] = useState<FlowStep>("passport");
  const [evaluation, setEvaluation] = useState<CieloVerifiedGuestEvaluation | null>(null);
  const [consentResult, setConsentResult] = useState<ConsentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [publicRef, setPublicRef] = useState<string | null>(null);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [guestName, setGuestName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  const fixture = searchParams.get("fixture");
  const passportReturn = encodeURIComponent(RETURN_PATH);

  const loadStatus = useCallback(async () => {
    if (!suiAddress) {
      setEvaluation(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await ensureBrowserSession(suiAddress);
      const qs = fixture ? `?fixture=${encodeURIComponent(fixture)}` : "";
      const res = await fetch(`/api/cielo/verified-rate/status${qs}`, { credentials: "include" });
      const data = await res.json() as { evaluation?: CieloVerifiedGuestEvaluation; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Status check failed");
      setEvaluation(data.evaluation ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Status check failed");
    } finally {
      setLoading(false);
    }
  }, [suiAddress, fixture]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const passportReady = Boolean(
    evaluation?.account_active && evaluation.profile_complete && evaluation.wallet_binding_active && evaluation.wallet_binding_fresh,
  );

  async function grantConsent() {
    if (!suiAddress) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/cielo/verified-rate/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json() as ConsentResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Consent failed");
      setConsentResult(data);
      if (data.decision === "approved") {
        setStep("submit");
      } else {
        setStep("done");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Consent failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    if (!suiAddress || !consentResult) return;
    if (!guestName.trim() || !contactEmail.trim()) {
      setErr("Name and email are required.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/cielo/verified-rate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          verification_decision_id: consentResult.verification_decision_id,
          consent_receipt_id: consentResult.consent_receipt_id,
          check_in: checkIn || undefined,
          check_out: checkOut || undefined,
          guests: parseInt(guests, 10) || undefined,
          guest_name: guestName.trim(),
          contact_email: contactEmail.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json() as { public_reference?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setPublicRef(data.public_reference ?? null);
      setStep("done");
      router.replace(`/cielo/verified-rate/confirmation?ref=${encodeURIComponent(data.public_reference ?? "")}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  const nights = checkIn && checkOut ? eachNight(checkIn, checkOut) : [];
  const est = checkIn && checkOut ? estimateUsdc(checkIn, checkOut) : 0;

  const visibleStep = step === "passport" ? 1 : step === "consent" ? 2 : 3;

  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${ACCENT}44`,
      background: "var(--surface-raised)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "1rem 1.15rem", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Pilot · Verified rate request
        </div>
        <h2 style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
          Check verified rate
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          Passport unlocks a pilot verified-rate request at Cielo — not a confirmed reservation or payment.
          Tier 1 only: account, profile, wallet binding, and consent. No partner API key required.
        </p>
      </div>

      <div style={{ padding: "0.85rem 1.15rem", display: "flex", gap: "0.35rem" }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            flex: 1, height: 4, borderRadius: 999,
            background: visibleStep >= n ? ACCENT : "var(--border)",
          }} />
        ))}
      </div>

      <div style={{ padding: "1rem 1.15rem 1.25rem" }}>
        {step === "passport" && (
          <>
            <StepLabel n={1} title="Passport ready" />
            {!isAuthenticated || !suiAddress ? (
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
                Sign in with Google to create your Abraxas Passport account.
              </p>
            ) : (
              <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <li style={{ color: evaluation?.account_active ? ACCENT : "var(--text-muted)" }}>
                  Account active {evaluation?.account_active ? "✓" : "—"}
                </li>
                <li style={{ color: evaluation?.profile_complete ? ACCENT : AMBER }}>
                  Profile complete {evaluation?.profile_complete ? "✓" : "(username or display name required)"}
                </li>
                <li style={{ color: evaluation?.wallet_binding_fresh ? ACCENT : AMBER }}>
                  Wallet bound (30d) {evaluation?.wallet_binding_fresh ? "✓" : "—"}
                </li>
                <li style={{ color: "var(--text-muted)" }}>
                  Identity credential optional {evaluation?.identity_credential_active ? "· active" : "· not required for pilot"}
                </li>
              </ul>
            )}

            {evaluation?.missing_steps?.length ? (
              <div style={{ marginBottom: "0.75rem", padding: "0.65rem", borderRadius: 10, background: `${AMBER}10`, border: `1px solid ${AMBER}33` }}>
                {evaluation.missing_steps.map(s => (
                  <div key={s} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: 4 }}>{s}</div>
                ))}
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {!isAuthenticated ? (
                <button type="button" onClick={() => void signInWithGoogle()} style={primaryBtn(false)}>
                  Sign in with Google →
                </button>
              ) : (
                <>
                  {!passportReady && (
                    <Link href={`/passport?return=${passportReturn}`} style={linkBtnStyle}>
                      Complete Passport →
                    </Link>
                  )}
                  {!evaluation?.profile_complete && (
                    <Link href={`/verify?mode=profile&return=${passportReturn}`} style={linkBtnStyle}>
                      Set up profile →
                    </Link>
                  )}
                  <button type="button" onClick={() => void loadStatus()} disabled={loading} style={ghostBtnStyle}>
                    {loading ? "Checking…" : "Refresh status"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("consent")}
                    disabled={!passportReady || loading}
                    style={primaryBtn(!passportReady || loading)}
                  >
                    Continue to consent →
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {step === "consent" && (
          <>
            <StepLabel n={2} title="Consent & eligibility" />
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
              Policy <code style={{ fontFamily: MONO, fontSize: "0.65rem" }}>cielo-verified-guest-v1</code> shares only:
              Passport account status, profile completeness, and wallet binding freshness — never raw ID documents.
            </p>
            <ul style={{ margin: "0 0 0.85rem", paddingLeft: "1.1rem", fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
              <li>passport_account</li>
              <li>profile_complete</li>
              <li>wallet_binding_confirmed</li>
            </ul>
            <button type="button" onClick={() => void grantConsent()} disabled={loading} style={primaryBtn(loading)}>
              {loading ? "Evaluating…" : "Approve consent & check eligibility →"}
            </button>
            <button type="button" onClick={() => setStep("passport")} style={{ ...ghostBtnStyle, marginTop: "0.5rem" }}>
              ← Back
            </button>
          </>
        )}

        {step === "submit" && consentResult && (
          <>
            <StepLabel n={3} title="Verified rate eligible" />
            <DecisionBadge label="APPROVED" sub="Verified Rate Eligible · pilot request" color={ACCENT} />
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0.75rem 0" }}>
              Submit a pilot verified-rate request. An operator will review — this is not a confirmed booking.
            </p>
            <Field label="Your name"><input value={guestName} onChange={e => setGuestName(e.target.value)} style={inputStyle} /></Field>
            <Field label="Email"><input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={inputStyle} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <Field label="Check-in (optional)"><input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inputStyle} /></Field>
              <Field label="Check-out (optional)"><input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={inputStyle} /></Field>
            </div>
            {nights.length > 0 && (
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.65rem" }}>
                {nights.length} nights · est. ~${est.toLocaleString()} USD (reference only)
              </p>
            )}
            <Field label="Guests (optional)">
              <input value={guests} onChange={e => setGuests(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Notes (optional)">
              <textarea value={notes} rows={2} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            <button type="button" onClick={() => void submitRequest()} disabled={loading} style={primaryBtn(loading)}>
              {loading ? "Submitting…" : "Submit verified-rate request →"}
            </button>
          </>
        )}

        {step === "done" && consentResult && consentResult.decision !== "approved" && (
          <>
            <StepLabel n={3} title="Eligibility result" />
            <DecisionBadge
              label={consentResult.display_decision}
              sub={consentResult.decision === "manual_review" ? "Pending review — complete missing steps" : "Not eligible for verified rate pilot"}
              color={consentResult.decision === "manual_review" ? AMBER : RED}
            />
            {consentResult.reason_codes.length > 0 && (
              <ul style={{ margin: "0.75rem 0", paddingLeft: "1.1rem", fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                {consentResult.reason_codes.map(c => <li key={c}>{c}</li>)}
              </ul>
            )}
            <Link href={`/passport?return=${passportReturn}`} style={{ ...linkBtnStyle, display: "inline-block", marginTop: "0.5rem" }}>
              Update Passport →
            </Link>
          </>
        )}

        {err && (
          <div style={{ marginTop: "0.75rem", padding: "0.55rem 0.65rem", borderRadius: 8, background: `${RED}10`, border: `1px solid ${RED}33`, color: RED, fontFamily: FONT, fontSize: "0.72rem" }}>
            {err}
          </div>
        )}

        {publicRef && step === "done" && (
          <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT, marginTop: "0.75rem" }}>
            Reference: {publicRef}
          </p>
        )}
      </div>
    </div>
  );
}

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
      Step {n} · {title}
    </div>
  );
}

function DecisionBadge({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div style={{ padding: "0.75rem", borderRadius: 12, background: `${color}12`, border: `1px solid ${color}44` }}>
      <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.55rem" }}>
      <label style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>
        {label}
      </label>
      {children}
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
    padding: "0.65rem 1rem", borderRadius: 999, border: "none",
    background: disabled ? `${ACCENT}55` : ACCENT, color: "#04130C",
    fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const ghostBtnStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem", borderRadius: 999, border: "1px solid var(--border)",
  background: "transparent", color: "var(--text-muted)", fontFamily: FONT,
  fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
};

const linkBtnStyle: React.CSSProperties = {
  padding: "0.55rem 0.9rem", borderRadius: 999, background: ACCENT, color: "#04130C",
  fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, textDecoration: "none",
};
