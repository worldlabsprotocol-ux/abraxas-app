// FILE: components/TokenizationRequestModal.tsx
// Multi-step tokenization request + USDC payment flow.
// Steps:  tier → info → payment → confirm → success
// Persists to Supabase (with localStorage fallback).
//
// V5 INTEGRATION NOTE:
//   Once a row reaches status='paid', a backend job (or admin action)
//   should create a userAsset with assetType='wyoming_llc' and link it
//   back via tokenization_requests.asset_id. The row then becomes
//   status='in_pipeline' and tracks the V5 10-stage lifecycle.
"use client";

import { useState } from "react";
import { tokenizationRequests } from "@/lib/supabase/client";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const BG_DEEP = "#040608";
const CARD = "#0D1117";
const CARD_2 = "#0A0D13";
const BDR = "#1C2333";
const G  = "#10B981";
const G_BR = "#20DCA5";
const A  = "#F59E0B";
const B  = "#3B82F6";
const P  = "#8B5CF6";
const R  = "#EF4444";
const W  = "#F8FAFC";

// Receiving wallet — the secure treasury. Solana Name Service domain.
const TREASURY_DOMAIN = "circuit.skr";
const TREASURY_LABEL  = "ABRAXAS SECURE TREASURY";

type Tier = "starter" | "growth" | "enterprise";
type Step = "tier" | "info" | "payment" | "confirm" | "success";

interface TierDef {
  id: Tier; name: string; price: number; color: string;
  tagline: string; features: string[];
}

const TIERS: TierDef[] = [
  { id: "starter",    name: "STARTER",    price: 1499, color: B,
    tagline: "Single LLC formation + tokenization",
    features: [
      "Wyoming LLC Formation",
      "Operating Agreement",
      "On-chain Tokenization (Token-2022)",
      "V5 Basic Verification Pipeline",
    ]},
  { id: "growth",     name: "GROWTH",     price: 2999, color: P,
    tagline: "Built for active operators",
    features: [
      "Everything in STARTER",
      "Multi-sig Governance",
      "On-chain Cap Table Management",
      "Lending-Eligible (60% LTV)",
    ]},
  { id: "enterprise", name: "ENTERPRISE", price: 4999, color: G,
    tagline: "Full institutional-grade package",
    features: [
      "Everything in GROWTH",
      "Full Compliance Package",
      "Priority Verification (24h initiation)",
      "Dedicated Verifier Assignment",
    ]},
];

const tierById = (id: Tier) => TIERS.find(t => t.id === id)!;

interface Props {
  open: boolean;
  onClose: () => void;
  initialTier?: Tier | null;
}

export function TokenizationRequestModal({ open, onClose, initialTier }: Props) {
  const [step, setStep]     = useState<Step>(initialTier ? "info" : "tier");
  const [tier, setTier]     = useState<Tier>(initialTier ?? "growth");
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [xHandle, setX]     = useState("");
  const [wallet, setWallet] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [source, setSource]       = useState<"supabase"|"local"|null>(null);
  const [txSig, setTxSig]         = useState("");
  const [busy, setBusy]           = useState(false);
  const [err,  setErr]            = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);

  if (!open) return null;

  const selectedTier = tierById(tier);

  function reset() {
    setStep(initialTier ? "info" : "tier");
    setTier(initialTier ?? "growth");
    setName(""); setEmail(""); setX(""); setWallet("");
    setRequestId(null); setSource(null); setTxSig("");
    setErr(null); setBusy(false);
  }

  function close() { reset(); onClose(); }

  async function submitInfo() {
    if (!name.trim()) { setErr("Business name is required."); return; }
    setBusy(true); setErr(null);
    try {
      const result = await tokenizationRequests.insert({
        business_name:  name.trim(),
        contact_email:  email.trim() || null,
        contact_x:      xHandle.trim() || null,
        sending_wallet: wallet.trim() || null,
        tier,
        amount_usdc:    selectedTier.price,
        status:         "pending_payment",
      });
      setRequestId(result.id);
      setSource(result.source);
      setStep("payment");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Submission failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPayment() {
    if (!requestId) return;
    setBusy(true); setErr(null);
    try {
      const sig = txSig.trim();
      if (sig) await tokenizationRequests.confirmPayment(requestId, sig);
      else     await tokenizationRequests.markPaymentSent(requestId);
      setStep("success");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Confirmation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  // ── Common UI bits ─────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 0.875rem", borderRadius: 5,
    border: `1px solid ${BDR}`, background: "rgba(255,255,255,0.03)",
    color: W, fontFamily: S, fontSize: "16px", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: M, fontSize: "0.75rem", fontWeight: 700,
    color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
    letterSpacing: "0.12em", marginBottom: "0.375rem", display: "block",
  };

  function StepIndicator() {
    const order: Step[] = ["tier","info","payment","confirm","success"];
    const labels = ["Tier","Info","Payment","Confirm","Done"];
    const curIdx = order.indexOf(step);
    return (
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.25rem" }}>
        {order.map((s, i) => {
          const done = i < curIdx;
          const active = i === curIdx;
          return (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 2, borderRadius: 1, marginBottom: 4,
                             background: active ? G : done ? `${G}60` : BDR }}/>
              <div style={{ fontFamily: M, fontSize: "0.65rem", fontWeight: 700,
                             color: active ? G : done ? `${G}80` : "rgba(255,255,255,0.2)",
                             textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(2,4,8,0.88)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "2rem 1rem", overflowY: "auto",
    }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{
        background: CARD, border: `1px solid ${G}40`, borderRadius: 10,
        width: "100%", maxWidth: 600,
        boxShadow: `0 0 50px ${G}20`, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.125rem 1.5rem", borderBottom: `1px solid ${BDR}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: CARD_2,
        }}>
          <div>
            <div style={{ fontFamily: M, fontSize: "0.75rem", fontWeight: 700,
                           color: G, letterSpacing: "0.15em",
                           textTransform: "uppercase", marginBottom: 4 }}>
              TOKENIZATION REQUEST
            </div>
            <div style={{ fontFamily: S, fontSize: "clamp(0.95rem,2.2vw,1.15rem)",
                           fontWeight: 800, color: W }}>
              {step === "success" ? "Submission complete." : "Launch your business on-chain."}
            </div>
          </div>
          <button onClick={close} style={{
            padding: "0.4rem 0.75rem", borderRadius: 4,
            border: `1px solid ${BDR}`, background: "transparent",
            color: "rgba(255,255,255,0.4)", fontFamily: M,
            fontSize: "1rem", fontWeight: 700, cursor: "pointer",
          }}>✕</button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem" }}>
          {step !== "success" && <StepIndicator/>}

          {/* ── STEP: TIER ─────────────────────────────────────────── */}
          {step === "tier" && (
            <div>
              <div style={{ fontFamily: S, fontSize: "1.1rem", fontWeight: 700,
                             color: W, marginBottom: "0.875rem" }}>
                Select your tier.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {TIERS.map(t => (
                  <button key={t.id} onClick={() => setTier(t.id)} style={{
                    padding: "1rem 1.125rem", borderRadius: 6,
                    textAlign: "left", cursor: "pointer",
                    border: `1px solid ${tier === t.id ? t.color : BDR}`,
                    borderLeft: `3px solid ${t.color}`,
                    background: tier === t.id ? `${t.color}10` : CARD_2,
                    transition: "all 0.15s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                   alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontFamily: M, fontSize: "0.875rem", fontWeight: 900,
                                      color: t.color, letterSpacing: "0.12em" }}>
                        {t.name}
                      </span>
                      <span style={{ fontFamily: M, fontSize: "1.1rem", fontWeight: 900,
                                      color: W }}>
                        ${t.price.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontFamily: S, fontSize: "0.78rem",
                                   color: "rgba(255,255,255,0.5)" }}>
                      {t.tagline}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("info")} style={{
                marginTop: "1.25rem", width: "100%",
                padding: "0.875rem", borderRadius: 5, border: "none",
                background: G, color: "#000", fontFamily: M,
                fontSize: "1rem", fontWeight: 900, cursor: "pointer",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                CONTINUE WITH {selectedTier.name} · ${selectedTier.price.toLocaleString()} →
              </button>
            </div>
          )}

          {/* ── STEP: INFO ─────────────────────────────────────────── */}
          {step === "info" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between",
                             alignItems: "baseline", marginBottom: "1rem" }}>
                <div style={{ fontFamily: S, fontSize: "1.05rem", fontWeight: 700,
                               color: W }}>
                  Tell us about your business.
                </div>
                <button onClick={() => setStep("tier")} style={{
                  fontFamily: M, fontSize: "0.78rem", color: `${G}90`,
                  background: "transparent", border: "none", cursor: "pointer",
                  textDecoration: "underline", textUnderlineOffset: 3,
                }}>
                  Change tier
                </button>
              </div>

              {/* Tier summary */}
              <div style={{ padding: "0.625rem 0.875rem",
                             background: `${selectedTier.color}10`,
                             border: `1px solid ${selectedTier.color}30`,
                             borderRadius: 5, marginBottom: "1rem",
                             display: "flex", justifyContent: "space-between",
                             alignItems: "center" }}>
                <div>
                  <span style={{ fontFamily: M, fontSize: "0.8rem", fontWeight: 900,
                                  color: selectedTier.color,
                                  letterSpacing: "0.12em" }}>
                    {selectedTier.name}
                  </span>
                  <span style={{ fontFamily: S, fontSize: "0.74rem",
                                  color: "rgba(255,255,255,0.4)",
                                  marginLeft: "0.625rem" }}>
                    {selectedTier.tagline}
                  </span>
                </div>
                <span style={{ fontFamily: M, fontSize: "0.85rem", fontWeight: 900,
                                color: W }}>
                  ${selectedTier.price.toLocaleString()}
                </span>
              </div>

              {/* Form */}
              <div style={{ marginBottom: "0.875rem" }}>
                <label style={labelStyle}>Business / Project Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Acme Holdings LLC" style={inputStyle}
                  autoComplete="off"/>
              </div>
              <div style={{ marginBottom: "0.875rem" }}>
                <label style={labelStyle}>Email (for fulfillment updates)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" style={inputStyle}
                  autoComplete="off" inputMode="email"/>
              </div>
              <div style={{ marginBottom: "0.875rem" }}>
                <label style={labelStyle}>X / Twitter Handle</label>
                <input type="text" value={xHandle} onChange={e => setX(e.target.value)}
                  placeholder="@yourhandle" style={inputStyle}
                  autoComplete="off"/>
              </div>
              <div style={{ marginBottom: "1.125rem" }}>
                <label style={labelStyle}>Sending Wallet (Solana address)</label>
                <input type="text" value={wallet} onChange={e => setWallet(e.target.value)}
                  placeholder="Your Solana wallet — tokens will be sent here"
                  style={inputStyle} autoComplete="off"/>
              </div>

              {err && (
                <div style={{ padding: "0.5rem 0.75rem", borderRadius: 4,
                               background: `${R}10`, border: `1px solid ${R}40`,
                               color: R, fontFamily: M, fontSize: "0.8rem",
                               marginBottom: "0.875rem" }}>
                  {err}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.625rem" }}>
                <button onClick={() => initialTier ? close() : setStep("tier")}
                  disabled={busy} style={{
                  flex: 1, padding: "0.875rem", borderRadius: 5,
                  border: `1px solid ${BDR}`, background: "transparent",
                  color: "rgba(255,255,255,0.5)", fontFamily: M,
                  fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {initialTier ? "Cancel" : "← Back"}
                </button>
                <button onClick={submitInfo} disabled={busy || !name.trim()} style={{
                  flex: 2, padding: "0.875rem", borderRadius: 5, border: "none",
                  background: G, color: "#000", fontFamily: M,
                  fontSize: "1rem", fontWeight: 900,
                  cursor: busy || !name.trim() ? "not-allowed" : "pointer",
                  opacity: busy || !name.trim() ? 0.5 : 1,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}>
                  {busy ? "SAVING..." : "CONTINUE TO PAYMENT →"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: PAYMENT ──────────────────────────────────────── */}
          {step === "payment" && (
            <div>
              <div style={{ fontFamily: S, fontSize: "1.05rem", fontWeight: 700,
                             color: W, marginBottom: "1rem" }}>
                Send USDC payment.
              </div>
              <div style={{ fontFamily: S, fontSize: "0.78rem",
                             color: "rgba(255,255,255,0.45)", marginBottom: "1rem",
                             lineHeight: 1.7 }}>
                Send the exact USDC amount on Solana to the treasury wallet below.
                Once received, we activate your tokenization within 24 hours.
              </div>

              {/* Amount card */}
              <div style={{ padding: "1.25rem", borderRadius: 7,
                             background: `${G}08`, border: `2px solid ${G}40`,
                             marginBottom: "0.75rem" }}>
                <div style={{ fontFamily: M, fontSize: "0.75rem", fontWeight: 700,
                               color: G, letterSpacing: "0.15em",
                               textTransform: "uppercase", marginBottom: 6 }}>
                  AMOUNT DUE
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "1rem",
                               marginBottom: "0.625rem" }}>
                  <span style={{ fontFamily: M, fontSize: "2rem", fontWeight: 900,
                                  color: W }}>
                    {selectedTier.price.toLocaleString()}
                  </span>
                  <span style={{ fontFamily: M, fontSize: "0.85rem", fontWeight: 700,
                                  color: G }}>USDC</span>
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
                                  color: G, background: `${G}15`,
                                  border: `1px solid ${G}30`, borderRadius: 3,
                                  padding: "2px 8px", letterSpacing: "0.08em" }}>
                    NETWORK · SOLANA
                  </span>
                  <span style={{ fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
                                  color: B, background: `${B}15`,
                                  border: `1px solid ${B}30`, borderRadius: 3,
                                  padding: "2px 8px", letterSpacing: "0.08em" }}>
                    TOKEN · USDC (SPL)
                  </span>
                  <span style={{ fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
                                  color: P, background: `${P}15`,
                                  border: `1px solid ${P}30`, borderRadius: 3,
                                  padding: "2px 8px", letterSpacing: "0.08em" }}>
                    TIER · {selectedTier.name}
                  </span>
                </div>
              </div>

              {/* Treasury wallet card */}
              <div style={{ padding: "1.125rem", borderRadius: 7,
                             background: CARD_2, border: `1px solid ${BDR}`,
                             borderLeft: `3px solid ${G_BR}`,
                             marginBottom: "1rem" }}>
                <div style={{ fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
                               color: "rgba(255,255,255,0.35)",
                               letterSpacing: "0.15em", textTransform: "uppercase",
                               marginBottom: 6 }}>
                  {TREASURY_LABEL}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem",
                               marginBottom: "1rem" }}>
                  <span style={{ fontFamily: M, fontSize: "1.1rem", fontWeight: 900,
                                  color: G_BR, letterSpacing: "0.02em",
                                  wordBreak: "break-all" }}>
                    {TREASURY_DOMAIN}
                  </span>
                  <button onClick={() => copy(TREASURY_DOMAIN)} style={{
                    padding: "0.3rem 0.625rem", borderRadius: 4,
                    border: `1px solid ${copied ? G : BDR}`,
                    background: copied ? `${G}15` : "transparent",
                    color: copied ? G : "rgba(255,255,255,0.6)",
                    fontFamily: M, fontSize: "0.78rem", fontWeight: 700,
                    cursor: "pointer", textTransform: "uppercase",
                    letterSpacing: "0.08em", whiteSpace: "nowrap",
                  }}>
                    {copied ? "✓ COPIED" : "COPY"}
                  </button>
                </div>
                <div style={{ fontFamily: S, fontSize: "0.72rem",
                               color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
                  Solana Name Service domain. Most Solana wallets resolve this
                  automatically when sending. If your wallet does not support SNS,
                  reach out to the team for the underlying address.
                </div>
              </div>

              {/* Instructions */}
              <div style={{ padding: "0.875rem 1rem", borderRadius: 6,
                             background: `${A}08`, border: `1px solid ${A}30`,
                             marginBottom: "1rem" }}>
                <div style={{ fontFamily: M, fontSize: "0.75rem", fontWeight: 700,
                               color: A, letterSpacing: "0.12em",
                               textTransform: "uppercase", marginBottom: 6 }}>
                  INSTRUCTIONS
                </div>
                <ol style={{ fontFamily: S, fontSize: "0.74rem",
                              color: "rgba(255,255,255,0.55)",
                              lineHeight: 1.8, margin: 0, paddingLeft: "1.25rem" }}>
                  <li>Open your Solana wallet (Phantom / Solflare / Backpack)</li>
                  <li>Send <strong>exactly ${selectedTier.price.toLocaleString()} USDC</strong> to <strong>{TREASURY_DOMAIN}</strong></li>
                  <li>Copy the transaction signature once confirmed</li>
                  <li>Return here and continue to confirmation</li>
                </ol>
              </div>

              {/* Request ID */}
              {requestId && (
                <div style={{ fontFamily: M, fontSize: "0.7rem",
                               color: "rgba(255,255,255,0.25)",
                               marginBottom: "1rem", letterSpacing: "0.05em",
                               wordBreak: "break-all" }}>
                  Request ID: {requestId} {source === "local" && "· (local fallback)"}
                </div>
              )}

              <button onClick={() => setStep("confirm")} style={{
                width: "100%", padding: "0.875rem", borderRadius: 5, border: "none",
                background: G, color: "#000", fontFamily: M,
                fontSize: "1rem", fontWeight: 900, cursor: "pointer",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                I&apos;VE SENT THE PAYMENT →
              </button>
            </div>
          )}

          {/* ── STEP: CONFIRM ──────────────────────────────────────── */}
          {step === "confirm" && (
            <div>
              <div style={{ fontFamily: S, fontSize: "1.05rem", fontWeight: 700,
                             color: W, marginBottom: "1rem" }}>
                Confirm your payment.
              </div>
              <div style={{ fontFamily: S, fontSize: "0.78rem",
                             color: "rgba(255,255,255,0.45)", marginBottom: "1.25rem",
                             lineHeight: 1.7 }}>
                Paste the Solana transaction signature so we can verify and activate
                your tokenization. Optional — you can also confirm without one and
                the team will reconcile.
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={labelStyle}>Transaction Signature (optional)</label>
                <input type="text" value={txSig} onChange={e => setTxSig(e.target.value)}
                  placeholder="Paste Solana tx signature"
                  style={{...inputStyle, fontFamily: M, fontSize: "0.9rem"}}
                  autoComplete="off"/>
                <div style={{ fontFamily: M, fontSize: "0.7rem",
                               color: "rgba(255,255,255,0.25)", marginTop: 4,
                               letterSpacing: "0.05em" }}>
                  Find this in your wallet&apos;s transaction history. Base58 string, ~88 chars.
                </div>
              </div>

              {err && (
                <div style={{ padding: "0.5rem 0.75rem", borderRadius: 4,
                               background: `${R}10`, border: `1px solid ${R}40`,
                               color: R, fontFamily: M, fontSize: "0.8rem",
                               marginBottom: "0.875rem" }}>
                  {err}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.625rem" }}>
                <button onClick={() => setStep("payment")} disabled={busy} style={{
                  flex: 1, padding: "0.875rem", borderRadius: 5,
                  border: `1px solid ${BDR}`, background: "transparent",
                  color: "rgba(255,255,255,0.5)", fontFamily: M,
                  fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  ← Back
                </button>
                <button onClick={confirmPayment} disabled={busy} style={{
                  flex: 2, padding: "0.875rem", borderRadius: 5, border: "none",
                  background: G, color: "#000", fontFamily: M,
                  fontSize: "1rem", fontWeight: 900,
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.5 : 1,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}>
                  {busy ? "CONFIRMING..." : "MARK PAYMENT COMPLETE ✓"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: SUCCESS ──────────────────────────────────────── */}
          {step === "success" && (
            <div>
              <div style={{ padding: "1.5rem", borderRadius: 8,
                             background: `${G}10`, border: `2px solid ${G}40`,
                             marginBottom: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", color: G, marginBottom: "1rem",
                               fontWeight: 900 }}>✓</div>
                <div style={{ fontFamily: S, fontSize: "1.25rem", fontWeight: 800,
                               color: W, marginBottom: "1rem" }}>
                  Payment recorded.
                </div>
                <div style={{ fontFamily: S, fontSize: "0.82rem",
                               color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  Your request is in our queue. Verification activates within
                  24 hours of payment confirmation.
                </div>
              </div>

              {/* Receipt */}
              <div style={{ padding: "1rem", background: CARD_2,
                             border: `1px solid ${BDR}`, borderRadius: 6,
                             marginBottom: "1.25rem" }}>
                <div style={{ fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
                               color: "rgba(255,255,255,0.3)",
                               letterSpacing: "0.12em", textTransform: "uppercase",
                               marginBottom: 8 }}>
                  RECEIPT
                </div>
                {[
                  ["Business",       name],
                  ["Tier",           selectedTier.name],
                  ["Amount",         `$${selectedTier.price.toLocaleString()} USDC`],
                  ["Request ID",     requestId ?? "—"],
                  ["TX Signature",   txSig ? `${txSig.slice(0, 12)}…${txSig.slice(-8)}` : "Pending verification"],
                  ["Status",         "PAID · Awaiting activation"],
                ].map(([k,v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between",
                                         padding: "0.35rem 0",
                                         borderBottom: `1px solid ${BDR}40`,
                                         gap: "1rem" }}>
                    <span style={{ fontFamily: M, fontSize: "0.75rem",
                                    color: "rgba(255,255,255,0.4)" }}>{k}</span>
                    <span style={{ fontFamily: M, fontSize: "0.8rem", fontWeight: 700,
                                    color: W, textAlign: "right",
                                    wordBreak: "break-all", maxWidth: "60%" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Next steps */}
              <div style={{ padding: "0.875rem 1rem", borderRadius: 6,
                             background: `${B}08`, border: `1px solid ${B}30`,
                             marginBottom: "1.25rem" }}>
                <div style={{ fontFamily: M, fontSize: "0.75rem", fontWeight: 700,
                               color: B, letterSpacing: "0.12em",
                               textTransform: "uppercase", marginBottom: 6 }}>
                  WHAT HAPPENS NEXT
                </div>
                <ol style={{ fontFamily: S, fontSize: "0.74rem",
                              color: "rgba(255,255,255,0.55)",
                              lineHeight: 1.8, margin: 0, paddingLeft: "1.25rem" }}>
                  <li>Treasury confirms USDC receipt (typically within 1 hour)</li>
                  <li>Asset created in V5 pipeline at SUBMITTED state</li>
                  <li>You receive an activation link via email/X</li>
                  <li>Track full lifecycle on your dashboard</li>
                </ol>
              </div>

              <button onClick={close} style={{
                width: "100%", padding: "0.875rem", borderRadius: 5, border: "none",
                background: G, color: "#000", fontFamily: M,
                fontSize: "1rem", fontWeight: 900, cursor: "pointer",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                CLOSE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
