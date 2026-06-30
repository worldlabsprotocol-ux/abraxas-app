// FILE: components/identity/AbraxasPassport.tsx
// Abraxas Digital Passport — dark premium credential card + stamp grid.
"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAbraxasID } from "@/lib/credentials/useAbraxasID";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { truncateDid, toSuiDid } from "@/lib/sui/identity";
import { PassportStampIcon, type PassportStampKind } from "./PassportStampIcon";
import { VerificationBadge } from "@/components/redesign/VerificationBadge";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";
const BLUE = "#3B82F6";
const VIOLET = "#8B5CF6";

const ALL_STAMPS = [
  { id: "identity",   label: "Identity",        kind: "identity" as PassportStampKind,   color: ACCENT, desc: "Gov ID + liveness confirmed" },
  { id: "biometric",  label: "Biometric",       kind: "biometric" as PassportStampKind,  color: ACCENT, desc: "Liveness match · face verification" },
  { id: "business",   label: "Business",        kind: "business" as PassportStampKind,   color: BLUE,   desc: "KYB complete · entity confirmed" },
  { id: "owner",      label: "Asset Owner",     kind: "owner" as PassportStampKind,      color: AMBER,  desc: "Ownership claim attested on-chain" },
  { id: "royalty",    label: "Royalty",         kind: "royalty" as PassportStampKind,    color: VIOLET, desc: "Publishing / royalty claim confirmed" },
  { id: "property",   label: "Property",        kind: "property" as PassportStampKind,  color: AMBER,  desc: "Real estate title chain verified" },
  { id: "tribal",     label: "Tribal",          kind: "tribal" as PassportStampKind,    color: ACCENT, desc: "Sovereign land / mineral rights" },
  { id: "compliance", label: "Compliance",      kind: "compliance" as PassportStampKind,color: ACCENT, desc: "AML / OFAC screening passed" },
  { id: "lending",    label: "Lending",         kind: "lending" as PassportStampKind,   color: ACCENT, desc: "Collateral credit verified" },
] as const;

export type StampId = typeof ALL_STAMPS[number]["id"];

function stampsFromCredential(level: string | undefined): StampId[] {
  if (!level) return [];
  if (level === "BASIC")    return ["identity", "compliance"];
  if (level === "STANDARD") return ["identity", "compliance", "biometric"];
  if (level === "ENHANCED") return ["identity", "compliance", "biometric", "owner", "business"];
  if (level === "ELITE")    return ["identity", "compliance", "biometric", "owner", "business", "lending"];
  return ["identity", "compliance"];
}

function Stamp({
  stamp, earned, onClick, active,
}: {
  stamp: typeof ALL_STAMPS[number];
  earned: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const [tip, setTip] = useState(false);
  const reduce = useReducedMotion();
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "0.375rem", cursor: onClick ? "pointer" : "default",
        position: "relative", background: "none", border: "none", padding: 0,
      }}
    >
      <motion.div
        key={String(earned)}
        initial={reduce ? false : (earned ? { scale: 0.55, opacity: 0 } : false)}
        animate={{ scale: tip && earned ? 1.06 : 1, opacity: earned ? 1 : 0.45 }}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
        style={{
          width: 56, height: 56, borderRadius: "50%",
          border: `2px solid ${active ? stamp.color : earned ? stamp.color : "var(--border)"}`,
          background: earned ? `${stamp.color}18` : "var(--surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
          boxShadow: earned ? `0 0 14px ${stamp.color}35` : "none",
          outline: active ? `2px solid ${stamp.color}60` : "none",
          outlineOffset: 2,
        }}
      >
        <PassportStampIcon kind={stamp.kind} size={22}
          color={earned ? stamp.color : "var(--text-muted)"} />
        {earned && (
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="26" fill="none"
              stroke={stamp.color} strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 3" />
          </svg>
        )}
      </motion.div>
      <div style={{
        fontFamily: FONT, fontSize: "0.52rem", fontWeight: 700,
        color: earned ? stamp.color : "var(--text-muted)",
        letterSpacing: "0.05em", textTransform: "uppercase",
        textAlign: "center", maxWidth: 72, lineHeight: 1.3,
      }}>
        {stamp.label}
      </div>
      {tip && earned && (
        <div style={{
          position: "absolute", bottom: "108%", left: "50%", transform: "translateX(-50%)",
          zIndex: 20, background: "var(--surface-raised)", border: `1px solid ${stamp.color}40`,
          borderRadius: 8, padding: "0.4rem 0.65rem",
          fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-secondary)",
          whiteSpace: "nowrap", pointerEvents: "none",
          boxShadow: "var(--shadow-card)",
        }}>
          {stamp.desc}
        </div>
      )}
    </Tag>
  );
}

export function AbraxasPassport({
  onGetVerified,
  suiAddress: propSuiAddress,
  /** @deprecated use suiAddress */
  walletAddress,
  earnedStamps: propStamps,
  onStampClick,
  activeStamp,
  showVision = true,
  showHeadline = true,
  didHint,
}: {
  onGetVerified?: () => void;
  suiAddress?: string | null;
  walletAddress?: string;
  earnedStamps?: StampId[];
  onStampClick?: (id: StampId) => void;
  activeStamp?: string | null;
  showVision?: boolean;
  showHeadline?: boolean;
  didHint?: string;
}) {
  const suiAuth = useSuiAuthOptional();
  const [launching, setLaunching] = useState(false);
  const [copied, setCopied] = useState(false);

  const holderAddress = propSuiAddress ?? suiAuth?.suiAddress ?? walletAddress ?? null;

  const { credential, status } = useAbraxasID(holderAddress);
  const earned: StampId[] = propStamps
    ?? stampsFromCredential(credential?.level)
    ?? (status === "verified" ? ["identity", "compliance"] : []);

  const total = ALL_STAMPS.length;
  const earnedCount = earned.length;
  const trustPct = Math.round((earnedCount / total) * 100);
  const trustLabel =
    earnedCount === 0 ? "UNVERIFIED"
    : earnedCount <= 2 ? "BASIC"
    : earnedCount <= 5 ? "VERIFIED"
    : earnedCount <= 8 ? "TRUSTED"
    : "ELITE";
  const trustColor =
    trustLabel === "UNVERIFIED" ? "var(--text-muted)"
    : trustLabel === "BASIC"    ? AMBER
    : trustLabel === "VERIFIED" ? ACCENT
    : trustLabel === "TRUSTED"  ? BLUE
    : VIOLET;

  const didDisplay = didHint
    ?? (holderAddress ? truncateDid(holderAddress) : "did:sui:…sign in");

  async function handleGetVerified() {
    if (!holderAddress) {
      onGetVerified?.();
      return;
    }
    setLaunching(true);
    try {
      const res = await fetch("/api/idv/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: holderAddress, document_type: "PASSPORT" }),
      });
      const data = await res.json() as { session_url?: string };
      if (data.session_url) {
        window.open(data.session_url, "_blank");
      } else {
        onGetVerified?.();
      }
    } catch {
      onGetVerified?.();
    } finally {
      setLaunching(false);
    }
  }

  function copyCredential() {
    const payload = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "AbraxasPassportCredential"],
      issuer: "did:web:abraxas-app.vercel.app",
      credentialSubject: {
        id: holderAddress ? toSuiDid(holderAddress) : "did:sui:unlinked",
        chain: "sui",
        sui_address: holderAddress,
        protocol: "abraxas",
        stamps: earned,
        level: trustLabel,
        stampBitmap: earned.length,
      },
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: "did:web:abraxas-app.vercel.app#issuer",
      },
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Credential card */}
      <div style={{
        borderRadius: 20, overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        boxShadow: "var(--shadow-glow)",
        position: "relative",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.9rem 1.25rem", borderBottom: "1px solid var(--border)",
          background: `${ACCENT}0A`, flexWrap: "wrap", gap: "0.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <svg width={22} height={22} viewBox="0 0 40 40" fill="none">
              <polygon points="20,2 38,20 20,38 2,20" stroke={ACCENT} strokeWidth="2" fill="none" />
              <polygon points="20,8 32,20 20,32 8,20" stroke={ACCENT} strokeWidth="1.5" fill={`${ACCENT}22`} />
              <circle cx="20" cy="20" r="3" fill={ACCENT} />
            </svg>
            <span style={{
              fontFamily: MONO, fontSize: "0.68rem", fontWeight: 900,
              color: ACCENT, letterSpacing: "0.14em",
            }}>
              ABRAXAS PASSPORT
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {status === "checking" && (
              <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)" }}>
                CHECKING…
              </span>
            )}
            <VerificationBadge
              label={`${trustLabel} · ${earnedCount}/${total}`}
              color={trustColor}
              check={earnedCount > 0}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: "clamp(1.15rem, 3vw, 1.5rem)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1.25rem",
          alignItems: "start",
        }}>
          <div>
            {showHeadline && (
              <>
                <h2 style={{
                  fontFamily: FONT, fontSize: "clamp(1.35rem, 3vw, 1.85rem)",
                  fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1,
                  letterSpacing: "-0.03em", margin: "0 0 0.625rem",
                }}>
                  Verify once.<br />
                  <span style={{ color: ACCENT }}>Transact everywhere.</span>
                </h2>
                <p style={{
                  fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
                  lineHeight: 1.7, maxWidth: 440, margin: "0 0 1.1rem",
                }}>
                  One W3C credential anchored on Sui. Sign in with Google via zkLogin —
                  documents stay off-chain, only stamp proofs are on-chain.
                </p>
              </>
            )}

            {/* Trust bar */}
            <div style={{ marginBottom: "1.1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{
                  fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  Trust level
                </span>
                <span style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, color: trustColor }}>
                  {earnedCount}/{total} stamps
                </span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(trustPct, earnedCount > 0 ? 4 : 0)}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: "100%", background: ACCENT, borderRadius: 3 }}
                />
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
              {status === "verified" ? (
                <div style={{
                  padding: "0.65rem 1.25rem", borderRadius: 999,
                  background: `${ACCENT}18`, border: `1px solid ${ACCENT}40`,
                  fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: ACCENT,
                }}>
                  ✓ Passport active
                </div>
              ) : (
                <Btn onClick={handleGetVerified} size="md">
                  {launching ? "Launching…" : "Get verified →"}
                </Btn>
              )}
              <Btn href="/docs/passport-spec" variant="secondary" size="md">Passport spec</Btn>
            </div>
          </div>

          {/* Right: credential metadata */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div style={{
              padding: "0.875rem 1rem", borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)",
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem",
              }}>
                Credential subject
              </div>
              <div style={{
                fontFamily: MONO, fontSize: "0.78rem", fontWeight: 700,
                color: "var(--text-secondary)", marginBottom: "0.5rem",
              }}>
                {didDisplay}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {["W3C VC v2.0", "Ed25519", "Sui · zkLogin"].map(tag => (
                  <span key={tag} style={{
                    fontFamily: MONO, fontSize: "0.5rem", fontWeight: 700,
                    color: ACCENT, letterSpacing: "0.06em",
                    padding: "0.2rem 0.45rem", borderRadius: 4,
                    background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
                lineHeight: 1.55, margin: "0.625rem 0 0",
              }}>
                No documents stored on-chain — only cryptographic proof of verification.
              </p>
            </div>

            <button
              onClick={copyCredential}
              style={{
                width: "100%", padding: "0.55rem 0.75rem", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: copied ? ACCENT : "var(--text-secondary)",
                fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.04em",
              }}
            >
              {copied ? "✓ COPIED" : "COPY CREDENTIAL JSON"}
            </button>

            <div style={{
              fontFamily: MONO, fontSize: "0.52rem", textAlign: "right",
              color: earnedCount > 0 ? ACCENT : "var(--text-muted)",
              letterSpacing: "0.06em",
            }}>
              {earnedCount > 0
                ? `✓ ${earnedCount} stamp${earnedCount > 1 ? "s" : ""} active`
                : "Sign in with Google, then start Precheck"}
            </div>
          </div>
        </div>

        {/* Technical strip */}
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "0.55rem 1.25rem",
          display: "flex", flexWrap: "wrap", gap: "1rem 1.5rem",
          background: "var(--surface)",
        }}>
          {[
            { k: "Standard", v: "W3C VC Data Model v2.0" },
            { k: "Signature", v: "Ed25519 · Abraxas issuer key" },
            { k: "Anchor", v: "Sui Passport object (devnet → mainnet)" },
            { k: "Privacy", v: "Documents off-chain · proof on-chain" },
          ].map(row => (
            <div key={row.k} style={{ display: "flex", gap: "0.4rem", alignItems: "baseline" }}>
              <span style={{
                fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
                color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
                {row.k}
              </span>
              <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-secondary)" }}>
                {row.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stamps grid */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "0.75rem",
        }}>
          <span style={{
            fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)",
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>
            Verification stamps
          </span>
          <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: `${ACCENT}99`, letterSpacing: "0.06em" }}>
            {earnedCount}/{total} earned
          </span>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
          gap: "0.75rem",
        }}>
          {ALL_STAMPS.map(s => (
            <Stamp
              key={s.id}
              stamp={s}
              earned={earned.includes(s.id)}
              active={activeStamp === s.id}
              onClick={onStampClick ? () => onStampClick(s.id) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Vision note */}
      {showVision && (
        <div style={{
          marginTop: "1.25rem", padding: "1rem 1.15rem", borderRadius: 14,
          background: `${ACCENT}08`, border: `1px solid ${ACCENT}22`,
        }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.55rem", color: ACCENT,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.45rem",
          }}>
            Portable by design
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.7, margin: 0,
          }}>
            Each stamp is a verifiable gate — identity, business, property, lending eligibility.
            External protocols will verify via CPI or signed presentation against the on-chain
            passport root. Integration SDK and program IDL are on the roadmap; credential
            structure is live today.
          </p>
        </div>
      )}
    </div>
  );
}

/** Map /passport page stamp state → AbraxasPassport stamp IDs */
export function passportStateToStampIds(
  state: { identity?: "earned" | "in_progress" | "not_started"; business?: "earned" | "in_progress" | "not_started"; asset_owner?: "earned" | "in_progress" | "not_started" },
): StampId[] {
  const earned: StampId[] = [];
  if (state.identity === "earned") {
    earned.push("identity", "biometric", "compliance");
  }
  if (state.business === "earned") earned.push("business");
  if (state.asset_owner === "earned") earned.push("owner");
  return earned;
}

/** Map /passport wizard stamp id → AbraxasPassport StampId for highlight */
export function passportWizardToStampId(wizardId: string): StampId | null {
  const map: Record<string, StampId> = {
    identity: "identity",
    business: "business",
    asset_owner: "owner",
  };
  return map[wizardId] ?? null;
}

/** Map AbraxasPassport stamp click → /passport wizard stamp id */
export function stampIdToPassportWizard(id: StampId): string {
  const map: Partial<Record<StampId, string>> = {
    identity: "identity",
    biometric: "identity",
    business: "business",
    owner: "asset_owner",
    compliance: "identity",
    royalty: "asset_owner",
    property: "asset_owner",
    tribal: "asset_owner",
    lending: "asset_owner",
  };
  return map[id] ?? "identity";
}
