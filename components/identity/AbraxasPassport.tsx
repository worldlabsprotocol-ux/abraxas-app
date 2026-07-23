// FILE: components/identity/AbraxasPassport.tsx
// Abraxas Digital Passport. dark premium credential card + stamp grid.
"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAbraxasID } from "@/lib/credentials/useAbraxasID";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { truncateDid, toSuiDid } from "@/lib/sui/identity";
import { PassportStampIcon, type PassportStampKind } from "./PassportStampIcon";
import { VerificationBadge } from "@/components/redesign/VerificationBadge";
import { ProductStatusBadge } from "@/components/ui/ProductStatusBadge";
import { Btn } from "@/components/redesign/ui";
import {
  STAMP_CATALOG,
  STAMPS_BY_LAYER,
  TRACKABLE_STAMP_IDS,
  PUBLIC_POSITIONING,
  type StampCatalogEntry,
} from "@/lib/passportLayers";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";
const BLUE = "#3B82F6";
const VIOLET = "#8B5CF6";

const DISPLAY_STAMPS = STAMP_CATALOG.filter(s => s.id !== "social");

export type StampId = typeof DISPLAY_STAMPS[number]["id"];

function stampKind(id: StampId): PassportStampKind {
  return id as PassportStampKind;
}

const STAMP_COLORS: Partial<Record<StampId, string>> = {
  identity: ACCENT,
  biometric: ACCENT,
  business: BLUE,
  owner: AMBER,
  royalty: VIOLET,
  property: AMBER,
  tribal: ACCENT,
  compliance: ACCENT,
  lending: ACCENT,
};

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
  stamp: StampCatalogEntry & { color: string };
  earned: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const [tip, setTip] = useState(false);
  const reduce = useReducedMotion();
  const Tag = onClick ? "button" : "div";
  const dimmed = !earned && (stamp.status === "planned" || stamp.status === "partner_gated");

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
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <motion.div
        key={String(earned)}
        initial={reduce ? false : (earned ? { scale: 0.55, opacity: 0 } : false)}
        animate={{ scale: tip && earned ? 1.06 : 1, opacity: earned ? 1 : dimmed ? 0.5 : 0.65 }}
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
        <PassportStampIcon kind={stampKind(stamp.id as StampId)} size={22}
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
      {!earned && (
        <ProductStatusBadge status={stamp.status} size="xs" />
      )}
      {tip && (
        <div style={{
          position: "absolute", bottom: "108%", left: "50%", transform: "translateX(-50%)",
          zIndex: 20, background: "var(--surface-raised)", border: `1px solid ${stamp.color}40`,
          borderRadius: 8, padding: "0.4rem 0.65rem", maxWidth: 220,
          fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-secondary)",
          lineHeight: 1.45, pointerEvents: "none",
          boxShadow: "var(--shadow-card)",
        }}>
          {stamp.desc}
          {stamp.availabilityNote && !earned && (
            <span style={{ display: "block", marginTop: 4, color: "var(--text-muted)" }}>
              {stamp.availabilityNote}
            </span>
          )}
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

  const total = TRACKABLE_STAMP_IDS.filter(id => id !== "social").length;
  const earnedTrackable = earned.filter(id => TRACKABLE_STAMP_IDS.includes(id as typeof TRACKABLE_STAMP_IDS[number])).length;
  const trustPct = Math.round((earnedTrackable / Math.max(total, 1)) * 100);
  const trustLabel =
    earnedTrackable === 0 ? "CORE ONLY"
    : earnedTrackable <= 2 ? "COMPLIANCE STARTED"
    : earnedTrackable <= 4 ? "VERIFIED"
    : "ENHANCED";
  const trustColor =
    trustLabel === "CORE ONLY" ? "var(--text-muted)"
    : trustLabel === "COMPLIANCE STARTED" ? AMBER
    : trustLabel === "VERIFIED" ? ACCENT
    : BLUE;

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
              label={`${trustLabel} · ${earnedTrackable}/${total} live claims`}
              color={trustColor}
              check={earnedTrackable > 0}
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
                  {PUBLIC_POSITIONING.proofNotDocuments} Documents stay with regulated providers , 
                  Abraxas carries signed claims you consent to share.
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
                  Trust level · pilot claims
                </span>
                <span style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, color: trustColor }}>
                  {earnedTrackable}/{total} earned
                </span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(trustPct, earnedTrackable > 0 ? 4 : 0)}%` }}
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
                No documents stored on-chain. only cryptographic proof of verification.
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
              color: earnedTrackable > 0 ? ACCENT : "var(--text-muted)",
              letterSpacing: "0.06em",
            }}>
              {earnedTrackable > 0
                ? `✓ ${earnedTrackable} claim${earnedTrackable > 1 ? "s" : ""} active`
                : "Passport Core ready · add claims when needed"}
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

      {/* Stamps by layer */}
      <div style={{ marginTop: "1.25rem" }}>
        {STAMPS_BY_LAYER.map(layer => {
          const layerStamps = layer.stamps.filter(s => s.id !== "social");
          if (!layerStamps.length) return null;
          return (
            <div key={layer.id} style={{ marginBottom: "1.15rem" }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "0.65rem", flexWrap: "wrap", gap: "0.35rem",
              }}>
                <span style={{
                  fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                }}>
                  {layer.title}
                </span>
                <ProductStatusBadge status={layer.status} size="xs" />
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
                gap: "0.75rem",
              }}>
                {layerStamps.map(s => (
                  <Stamp
                    key={s.id}
                    stamp={{ ...s, color: STAMP_COLORS[s.id as StampId] ?? ACCENT }}
                    earned={earned.includes(s.id as StampId)}
                    active={activeStamp === s.id}
                    onClick={onStampClick ? () => onStampClick(s.id as StampId) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
        <p style={{
          fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
          lineHeight: 1.55, margin: "0.35rem 0 0",
        }}>
          {PUBLIC_POSITIONING.disclaimer}
        </p>
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
            Each claim is a specific credential. identity, screening, KYB, asset ownership, lending eligibility.
            Partners verify via API with their own policy rules. Planned claims are shown for roadmap transparency.
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
