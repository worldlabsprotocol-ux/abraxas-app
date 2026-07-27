"use client";
// FILE: components/home/cinematic/KycDocumentCards.tsx
// Institutional demo visuals. premium app screens, proof artifact, passport.

import { motion, AnimatePresence } from "framer-motion";
import { INSTITUTIONAL_GOLD, INSTITUTIONAL_GOLD_PALE, INSTITUTIONAL_VIOLET } from "@/lib/design/institutionalTheme";
import {
  VERIFICATION_PARADE_INDUSTRIES,
  type VerificationParadeIndustry,
} from "@/lib/verificationParadeIndustries";
import { CosmicParticleField } from "./CosmicDemoEffects";
import { DEMO_TYPE } from "./demoPremium";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const CARD_SHADOW = "0 24px 64px rgba(0,0,0,0.6)";
const HERO_SHADOW = "0 32px 90px rgba(0,0,0,0.65)";

function DocShell({
  children,
  width,
  height,
  border = "1px solid rgba(255,255,255,0.1)",
  accent,
  className,
  style,
}: {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  border?: string;
  accent?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        width: width ?? "100%",
        height,
        borderRadius: 14,
        border: accent ? `1px solid ${accent}55` : border,
        background: "linear-gradient(165deg, rgba(22,18,30,0.98) 0%, rgba(8,8,14,0.99) 100%)",
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Rising burden — industry parade mode cycles gates; legacy mode shows ×count */
export function VerificationDebtMeter({
  count,
  max = 12,
  industries,
  activeIndex = 0,
}: {
  count?: number;
  max?: number;
  industries?: VerificationParadeIndustry[];
  activeIndex?: number;
}) {
  const parade = count === undefined;
  const paradeList = industries?.length ? industries : VERIFICATION_PARADE_INDUSTRIES;
  const idx = parade ? activeIndex % paradeList.length : 0;
  const active = paradeList[idx];
  const paradePct = parade ? ((idx + 1) / paradeList.length) * 100 : 0;

  if (parade) {
    return (
      <motion.div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{
            fontFamily: MONO, fontSize: DEMO_TYPE.debtLabel,
            color: "rgba(248,113,113,0.95)", letterSpacing: "0.12em", fontWeight: 800,
            display: "block",
          }}>
            VERIFICATION PARADE
          </span>
          <span style={{
            fontFamily: FONT, fontSize: DEMO_TYPE.debtSub,
            color: "rgba(255,255,255,0.45)", marginTop: 4, display: "block",
          }}>
            Same person. New industry. Upload your ID again.
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(248,113,113,0.45)",
              background: "linear-gradient(135deg, rgba(248,113,113,0.14) 0%, rgba(0,0,0,0.35) 100%)",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            <div style={{
              fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
              letterSpacing: "0.14em", color: "rgba(248,113,113,0.8)",
              marginBottom: 6, textTransform: "uppercase",
            }}>
              Gate {idx + 1} of {paradeList.length}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "clamp(1.35rem, 4vw, 1.75rem)",
              fontWeight: 900, letterSpacing: "-0.03em", color: "#FEE2E2",
              lineHeight: 1.1, marginBottom: 6,
            }}>
              {active.label}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: DEMO_TYPE.sm, color: "rgba(255,255,255,0.55)",
              lineHeight: 1.45,
            }}>
              {active.gate}
            </div>
          </motion.div>
        </AnimatePresence>

        <div style={{
          height: 8, borderRadius: 999, background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(248,113,113,0.25)", overflow: "hidden", position: "relative",
          marginBottom: 10,
        }}>
          <motion.div
            animate={{ width: `${paradePct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 16 }}
            style={{
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #DC2626 0%, #F87171 40%, #FCA5A5 100%)",
              boxShadow: "0 0 20px rgba(248,113,113,0.55)",
            }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {paradeList.map((ind, i) => {
            const isActive = i === idx;
            const isPast = i < idx;
            return (
              <span
                key={ind.id}
                style={{
                  fontFamily: MONO,
                  fontSize: "0.52rem",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "4px 9px",
                  borderRadius: 999,
                  border: `1px solid ${isActive ? "rgba(248,113,113,0.75)" : isPast ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.12)"}`,
                  color: isActive ? "#FCA5A5" : isPast ? "rgba(248,113,113,0.65)" : "rgba(255,255,255,0.35)",
                  background: isActive ? "rgba(248,113,113,0.2)" : isPast ? "rgba(248,113,113,0.08)" : "transparent",
                  transform: isActive ? "scale(1.05)" : undefined,
                  transition: "all 0.25s ease",
                }}
              >
                {ind.label}
              </span>
            );
          })}
        </div>
      </motion.div>
    );
  }

  const debtCount = count ?? 1;
  const pct = Math.min(100, (debtCount / max) * 100);
  const milestones = [2, 4, 7];
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        marginBottom: 8, gap: 8, flexWrap: "wrap",
      }}>
        <div>
          <span style={{
            fontFamily: MONO, fontSize: DEMO_TYPE.debtLabel,
            color: "rgba(248,113,113,0.95)", letterSpacing: "0.12em", fontWeight: 800,
            display: "block",
          }}>
            VERIFICATION DEBT
          </span>
          <span style={{
            fontFamily: FONT, fontSize: DEMO_TYPE.debtSub,
            color: "rgba(255,255,255,0.45)", marginTop: 4, display: "block",
          }}>
            Not asset proof. repeated trust rebuilds
          </span>
        </div>
        <motion.span
          key={debtCount}
          initial={{ scale: 1.35, opacity: 0, color: "#fff" }}
          animate={{ scale: 1, opacity: 1, color: "#FCA5A5" }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          style={{
            fontFamily: FONT, fontSize: DEMO_TYPE.counter, fontWeight: 900,
            letterSpacing: "-0.04em", lineHeight: 1,
          }}
        >
          ×{debtCount}
        </motion.span>
      </div>
      <div style={{
        height: 8, borderRadius: 999, background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(248,113,113,0.25)", overflow: "hidden", position: "relative",
      }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
          style={{
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #DC2626 0%, #F87171 40%, #FCA5A5 100%)",
            boxShadow: "0 0 20px rgba(248,113,113,0.55)",
          }}
        />
        {milestones.map(m => (
          <div
            key={m}
            style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${(m / max) * 100}%`,
              width: 1, background: debtCount >= m ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 6,
        fontFamily: MONO, fontSize: DEMO_TYPE.micro, color: "rgba(248,113,113,0.55)",
      }}>
        {milestones.map(m => (
          <span key={m} style={{ opacity: debtCount >= m ? 1 : 0.4 }}>×{m}</span>
        ))}
      </div>
    </div>
  );
}

/** Floating verify-again badges that stack with burden */
export function BurdenStackLayer({ count }: { count: number }) {
  const badges = Math.min(5, Math.floor(count / 2));
  if (badges < 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: badges }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 0.15 + i * 0.08, y: i * 6, scale: 1 }}
          style={{
            position: "absolute",
            top: `${8 + i * 4}%`,
            left: `${10 + i * 6}%`,
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid rgba(248,113,113,0.35)",
            background: "rgba(248,113,113,0.08)",
            fontFamily: MONO,
            fontSize: DEMO_TYPE.sm,
            fontWeight: 800,
            color: "#FCA5A5",
            letterSpacing: "0.08em",
            transform: `rotate(${-4 + i * 2}deg)`,
          }}
        >
          VERIFY AGAIN
        </motion.div>
      ))}
    </div>
  );
}

export function IdentitySourceScreen({ copies = 3 }: { copies?: number }) {
  return (
    <DocShell width="100%" accent={INSTITUTIONAL_VIOLET} style={{ maxWidth: 200 }}>
      <div style={{
        padding: "6px 10px", borderBottom: "1px solid rgba(167,139,250,0.2)",
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(167,139,250,0.06)",
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F87171" }} />
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: INSTITUTIONAL_GOLD, opacity: 0.6 }} />
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", opacity: 0.6 }} />
        <span style={{ fontFamily: MONO, fontSize: "0.38rem", color: "rgba(255,255,255,0.45)", marginLeft: "auto" }}>
          YOUR VAULT
        </span>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, color: "#FAFAFA", marginBottom: 8 }}>
          Identity + asset proof
        </div>
        {["Government ID", "Selfie / liveness", "Bank statements"].map((row, i) => (
          <div key={row} style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 5,
            opacity: i < Math.min(copies, 3) ? 1 : 0.35,
          }}>
            <span style={{ fontSize: "0.55rem", color: "#10B981" }}>✓</span>
            <span style={{ fontFamily: FONT, fontSize: "0.48rem", color: "rgba(255,255,255,0.7)" }}>{row}</span>
          </div>
        ))}
        <motion.div
          animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.02, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{
            marginTop: 8, padding: "6px 8px", borderRadius: 8, textAlign: "center",
            border: "1px dashed rgba(232,197,71,0.4)", background: "rgba(232,197,71,0.08)",
            fontFamily: MONO, fontSize: "0.4rem", color: INSTITUTIONAL_GOLD_PALE, fontWeight: 700,
          }}
        >
          Same files sent {copies}× today
        </motion.div>
      </div>
    </DocShell>
  );
}

const ACCENT_MAP = { violet: INSTITUTIONAL_VIOLET, gold: INSTITUTIONAL_GOLD } as const;

const PORTAL_ICONS: Record<string, string> = {
  "RWA marketplace": "◈",
  "Private lender": "◇",
  "Hospitality ops": "✦",
  "Custody": "⬡",
};

export function AppVerificationPortal({
  name,
  context,
  icon,
  accent = "violet",
  pulse = false,
  uploadN,
  showModal = false,
}: {
  name: string;
  context?: string;
  icon?: string;
  accent?: keyof typeof ACCENT_MAP | string;
  pulse?: boolean;
  uploadN?: number;
  showModal?: boolean;
}) {
  const accentColor = accent === "violet" || accent === "gold" ? ACCENT_MAP[accent] : (accent as string);
  const portalIcon = icon ?? PORTAL_ICONS[name] ?? "▣";

  return (
    <motion.div
      animate={pulse ? {
        y: [0, -5, 0],
        boxShadow: [
          `0 16px 40px rgba(0,0,0,0.5)`,
          `0 24px 56px ${accentColor}50`,
          `0 16px 40px rgba(0,0,0,0.5)`,
        ],
      } : undefined}
      transition={pulse ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        width: "100%",
        borderRadius: 14,
        border: pulse ? `2px solid ${accentColor}99` : `1px solid ${accentColor}44`,
        background: "linear-gradient(165deg, rgba(20,16,28,0.99) 0%, rgba(6,6,12,0.99) 100%)",
        boxShadow: pulse ? `0 0 32px ${accentColor}28` : CARD_SHADOW,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {showModal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: "absolute", inset: 0, zIndex: 3,
            background: "rgba(0,0,0,0.78)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 10,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{
              padding: "12px 14px", borderRadius: 12, width: "100%",
              border: `2px solid ${accentColor}88`,
              background: "linear-gradient(160deg, #1a1524, #0c0a12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.15rem", marginBottom: 6 }}>↻</div>
            <div style={{ fontFamily: FONT, fontSize: DEMO_TYPE.md, fontWeight: 900, color: "#fff" }}>
              Verify again
            </div>
            <div style={{ fontFamily: FONT, fontSize: DEMO_TYPE.sm, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
              Re-upload identity + asset proof
            </div>
          </motion.div>
        </motion.div>
      )}
      <div style={{
        padding: "6px 10px", borderBottom: `1px solid ${accentColor}22`,
        display: "flex", alignItems: "center", gap: 6,
        background: `linear-gradient(90deg, ${accentColor}16, transparent)`,
      }}>
        <span style={{ fontSize: "0.8rem" }}>{portalIcon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            display: "block", fontFamily: FONT,
            fontSize: DEMO_TYPE.portalTitle,
            fontWeight: 800, color: "#FAFAFA", lineHeight: 1.2,
          }}>
            {name}
          </span>
          {context && (
            <span style={{
              display: "block", fontFamily: FONT, fontSize: DEMO_TYPE.micro,
              color: "rgba(255,255,255,0.42)", marginTop: 2,
            }}>
              {context}
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: "10px 11px 11px" }}>
        <div style={{
          padding: "6px 8px", borderRadius: 8, marginBottom: 8,
          border: "1px solid rgba(248,113,113,0.4)",
          background: "rgba(248,113,113,0.09)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: DEMO_TYPE.micro, color: "#FCA5A5", letterSpacing: "0.06em", fontWeight: 700 }}>
            REQUESTING
          </div>
          <div style={{ fontFamily: FONT, fontSize: DEMO_TYPE.sm, color: "rgba(255,255,255,0.75)", marginTop: 4, lineHeight: 1.35 }}>
            ID · selfie · proof of address · asset docs
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontFamily: FONT, fontSize: DEMO_TYPE.sm, fontWeight: 900,
            color: INSTITUTIONAL_GOLD, letterSpacing: "0.08em",
          }}>
            VERIFY AGAIN
          </span>
          {uploadN != null && (
            <span style={{
              fontFamily: MONO, fontSize: DEMO_TYPE.xs, padding: "3px 8px", borderRadius: 6,
              background: "rgba(248,113,113,0.18)", color: "#FCA5A5",
              border: "1px solid rgba(248,113,113,0.4)", fontWeight: 700,
            }}>
              #{uploadN}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function VerificationBurdenCounter({ count }: { count: number }) {
  return <VerificationDebtMeter count={count} />;
}

export function DocumentStackMini({ copies }: { copies: number }) {
  return <IdentitySourceScreen copies={copies} />;
}

export function AbraxasPassportVc({
  pulse = false,
  large = false,
  merge = false,
}: {
  pulse?: boolean;
  large?: boolean;
  merge?: boolean;
}) {
  const w = large ? 260 : 200;
  const h = large ? 162 : 128;
  return (
    <motion.div
      initial={merge ? { scale: 0.7, opacity: 0 } : false}
      animate={pulse ? {
        boxShadow: [
          `0 0 56px rgba(232,197,71,0.45), 0 28px 64px rgba(0,0,0,0.55)`,
          `0 0 96px rgba(232,197,71,0.65), 0 32px 72px rgba(0,0,0,0.6)`,
          `0 0 56px rgba(232,197,71,0.45), 0 28px 64px rgba(0,0,0,0.55)`,
        ],
      } : undefined}
      transition={pulse ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { type: "spring", stiffness: 120 }}
      style={{
        width: w,
        height: h,
        borderRadius: 18,
        border: `2px solid ${INSTITUTIONAL_GOLD}`,
        background: "linear-gradient(155deg, #18141f 0%, #05080a 100%)",
        boxShadow: `0 0 64px rgba(232,197,71,0.4), 0 32px 60px rgba(0,0,0,0.55)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {(pulse || merge) && <CosmicParticleField accent={INSTITUTIONAL_GOLD} count={12} />}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute", inset: -6, borderRadius: 22,
          border: "1px dashed rgba(232,197,71,0.2)",
          pointerEvents: "none",
        }}
      />
      <div style={{
        position: "absolute", top: 12, right: 12,
        width: 28, height: 28, borderRadius: "50%",
        background: "rgba(16,185,129,0.25)", border: "2px solid #10B981",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.75rem", color: "#10B981", fontWeight: 800,
      }}>
        ✓
      </div>
      <div style={{ fontFamily: MONO, fontSize: DEMO_TYPE.md, letterSpacing: "0.16em", color: INSTITUTIONAL_VIOLET }}>
        ABRAXAS
      </div>
      <div style={{
        fontFamily: FONT,
        fontSize: large ? "1.5rem" : "1.15rem",
        fontWeight: 900,
        color: INSTITUTIONAL_GOLD_PALE,
        letterSpacing: "-0.03em",
      }}>
        Passport
      </div>
      <div style={{ fontFamily: FONT, fontSize: DEMO_TYPE.md, color: "rgba(255,255,255,0.65)" }}>
        Verified once · portable
      </div>
      <div style={{ fontFamily: MONO, fontSize: DEMO_TYPE.xs, color: "rgba(16,185,129,0.95)", marginTop: 2 }}>
        W3C VC · ED25519
      </div>
    </motion.div>
  );
}

/** Hero authentication proof. centerpiece of Act 3 */
const DEFAULT_PROOF_ID = "aprx_cielo_sunrise_7f3a9c2e";

export function AuthenticationProofArtifact({
  pulse = false,
  hero = false,
  issued = false,
  proofId = DEFAULT_PROOF_ID,
}: {
  pulse?: boolean;
  hero?: boolean;
  issued?: boolean;
  proofId?: string;
}) {
  const width = hero ? "min(100%, 460px)" : 200;
  const shortId = proofId.length > 28 ? `${proofId.slice(0, 24)}…` : proofId;

  return (
    <motion.div
      className="cine-proof-hero"
      initial={issued ? { scale: 0.88, opacity: 0 } : false}
      animate={pulse ? {
        boxShadow: [
          "0 0 48px rgba(232,197,71,0.35), 0 28px 72px rgba(0,0,0,0.55)",
          "0 0 88px rgba(16,185,129,0.45), 0 32px 80px rgba(0,0,0,0.6)",
          "0 0 48px rgba(232,197,71,0.35), 0 28px 72px rgba(0,0,0,0.55)",
        ],
      } : undefined}
      transition={pulse ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.55, type: "spring" }}
      style={{
        width,
        borderRadius: hero ? 18 : 14,
        border: `2px solid ${INSTITUTIONAL_GOLD}`,
        background: "linear-gradient(155deg, #16121c 0%, #040608 100%)",
        boxShadow: hero ? "0 0 72px rgba(232,197,71,0.35), 0 32px 80px rgba(0,0,0,0.6)" : HERO_SHADOW,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {(pulse || issued) && <CosmicParticleField accent={INSTITUTIONAL_GOLD} count={issued ? 16 : 10} />}
      {issued && (
        <motion.div
          initial={{ scale: 1.8, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: -8 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 2,
            padding: "6px 12px", borderRadius: 6,
            border: "2px solid rgba(16,185,129,0.6)",
            background: "rgba(16,185,129,0.15)",
            fontFamily: MONO, fontSize: DEMO_TYPE.sm, fontWeight: 900,
            color: "#6EE7B7", letterSpacing: "0.14em",
          }}
        >
          ISSUED
        </motion.div>
      )}
      <div style={{
        padding: hero ? "10px 14px" : "6px 10px",
        borderBottom: "1px solid rgba(232,197,71,0.28)",
        background: "linear-gradient(90deg, rgba(232,197,71,0.14), rgba(16,185,129,0.1))",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
      }}>
        <span style={{
          fontFamily: MONO, fontSize: hero ? DEMO_TYPE.md : DEMO_TYPE.xs,
          letterSpacing: "0.14em", color: INSTITUTIONAL_GOLD, fontWeight: 800,
        }}>
          AUTHENTICATION PROOF
        </span>
        <span style={{
          fontFamily: MONO, fontSize: DEMO_TYPE.micro, padding: "4px 10px", borderRadius: 6,
          background: "rgba(16,185,129,0.22)", color: "#6EE7B7",
          border: "1px solid rgba(16,185,129,0.45)", fontWeight: 700,
        }}>
          ANYONE CAN VERIFY
        </span>
      </div>
      <div style={{ padding: hero ? "16px 16px 18px" : "10px 11px 11px" }}>
        <div style={{
          fontFamily: MONO,
          fontSize: DEMO_TYPE.proofId,
          color: INSTITUTIONAL_GOLD_PALE,
          marginBottom: hero ? 14 : 8,
          letterSpacing: "-0.02em",
          fontWeight: 700,
        }}>
          {shortId}
        </div>
        {hero && (
          <div style={{
            padding: "8px 10px", borderRadius: 8, marginBottom: 12,
            background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)",
            fontFamily: MONO, fontSize: DEMO_TYPE.sm, color: "rgba(255,255,255,0.55)",
          }}>
            GET /api/proof/{proofId}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: hero ? 8 : 5 }}>
          {[
            { label: "ED25519 SIGNED", ok: true },
            { label: "signature_valid: true", ok: true },
            { label: "Sui anchor · optional pulse", ok: true },
          ].map(({ label, ok }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: hero ? 18 : 14, height: hero ? 18 : 14, borderRadius: 5,
                fontSize: hero ? "0.6rem" : "0.5rem",
                background: ok ? "rgba(16,185,129,0.22)" : "rgba(255,255,255,0.06)",
                color: ok ? "#10B981" : "rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
              }}>✓</span>
              <span style={{
                fontFamily: MONO,
                fontSize: hero ? DEMO_TYPE.proofRow : DEMO_TYPE.micro,
                color: "rgba(255,255,255,0.72)",
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function NoRelayBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      marginTop: compact ? 0 : 12, padding: compact ? "8px 12px" : "10px 14px", borderRadius: 10,
      background: "rgba(0,0,0,0.4)",
      border: "1px solid rgba(16,185,129,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    }}>
      <span style={{ fontSize: "0.75rem", opacity: 0.4, textDecoration: "line-through" }}>✉</span>
      <span style={{
        fontFamily: FONT, fontSize: compact ? DEMO_TYPE.sm : DEMO_TYPE.noRelay,
        fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.03em",
      }}>
        No inbox · no relay · no trust in Abraxas servers
      </span>
    </div>
  );
}

export function ReferenceContextCard({
  label = "Cielo Sunrise",
  sublabel = "ABX-RE-HOSP-001 · Hospitality",
  accent = INSTITUTIONAL_GOLD,
  highlight = false,
}: {
  label?: string;
  sublabel?: string;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <motion.div animate={highlight ? { scale: [1, 1.02, 1] } : undefined} transition={{ duration: 2, repeat: Infinity }}>
      <DocShell width="100%" accent={accent} style={{ maxWidth: 220 }}>
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }} />
        <div style={{ padding: "12px 14px" }}>
          <div style={{
            fontFamily: MONO, fontSize: DEMO_TYPE.micro, color: accent,
            letterSpacing: "0.1em", marginBottom: 6, fontWeight: 800,
          }}>
            LIVE REFERENCE
          </div>
          <div style={{
            fontFamily: FONT, fontSize: DEMO_TYPE.cardTitle,
            fontWeight: 900, color: "#FAFAFA", lineHeight: 1.2,
          }}>
            {label}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: DEMO_TYPE.sm, color: "rgba(255,255,255,0.5)",
            marginTop: 6, lineHeight: 1.4,
          }}>
            {sublabel}
          </div>
        </div>
      </DocShell>
    </motion.div>
  );
}

export function CounterpartyVerifierCard({
  label = "Private lender",
  active = false,
}: {
  label?: string;
  active?: boolean;
}) {
  return (
    <motion.div
      animate={active ? {
        boxShadow: [
          "0 24px 56px rgba(0,0,0,0.55)",
          "0 0 48px rgba(16,185,129,0.4), 0 28px 64px rgba(0,0,0,0.55)",
          "0 24px 56px rgba(0,0,0,0.55)",
        ],
      } : undefined}
      transition={active ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <DocShell width="100%" accent="#10B981" style={{ maxWidth: 240 }}>
        <div style={{ padding: "14px 16px", textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, margin: "0 auto 8px",
            background: active ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.18)",
            border: `2px solid rgba(16,185,129,${active ? "0.7" : "0.45"})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 14 14" aria-hidden fill="none">
              <path d="M2 7l3 3 7-7" stroke="#6EE7B7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{
            fontFamily: FONT, fontSize: DEMO_TYPE.verifierTitle,
            fontWeight: 800, color: "#FAFAFA",
          }}>
            {label}
          </div>
          <div style={{ fontFamily: MONO, fontSize: DEMO_TYPE.micro, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
            Relying party
          </div>
          <motion.div
            animate={active ? { scale: [1, 1.02, 1] } : undefined}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              marginTop: 10, padding: "10px 12px", borderRadius: 10,
              background: active ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.12)",
              border: `1px solid rgba(16,185,129,${active ? "0.65" : "0.35"})`,
            }}
          >
            <div style={{
              fontFamily: MONO, fontSize: DEMO_TYPE.sm, color: "#6EE7B7",
              letterSpacing: "0.08em", fontWeight: 800,
            }}>
              {active ? "DECISION: APPROVED" : "VERIFYING PROOF…"}
            </div>
            <div style={{
              fontFamily: MONO, fontSize: DEMO_TYPE.micro, color: "rgba(255,255,255,0.55)",
              marginTop: 6,
            }}>
              Independent signature check
            </div>
          </motion.div>
        </div>
      </DocShell>
    </motion.div>
  );
}

export function ConnectionBeam({
  vertical = false,
  active = true,
  animated = false,
}: {
  vertical?: boolean;
  active?: boolean;
  animated?: boolean;
}) {
  const gradId = vertical ? "beamV" : "beamH";
  if (vertical) {
    return (
      <svg width="28" height={48} viewBox="0 0 28 48" aria-hidden style={{ overflow: "visible", opacity: active ? 1 : 0.2 }}>
        <motion.path
          d="M 14 0 Q 20 24 14 48"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: active ? 1 : 0.2 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 70 }}
        />
        {animated && active && (
          <motion.circle
            r="4"
            fill={INSTITUTIONAL_GOLD}
            animate={{ offsetDistance: ["0%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            style={{ offsetPath: 'path("M 14 0 Q 20 24 14 48")' }}
          />
        )}
        <defs>
          <linearGradient id="beamV" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8C547" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.95" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  return (
    <svg width="64" height="32" viewBox="0 0 64 32" aria-hidden style={{ overflow: "visible", flexShrink: 0, opacity: active ? 1 : 0.2 }}>
      <motion.path
        d="M 0 16 Q 32 4 64 16"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: active ? 1 : 0.2 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 70 }}
      />
      {animated && active && (
        <motion.circle
          r="4"
          fill={INSTITUTIONAL_GOLD}
          animate={{ offsetDistance: ["0%", "100%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          style={{ offsetPath: 'path("M 0 16 Q 32 4 64 16")' }}
        />
      )}
      <defs>
        <linearGradient id="beamH" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E8C547" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.95" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DuplicateArrows({ active = true }: { active?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={active ? { opacity: [0.2, 1, 0.2], x: [0, 4, 8] } : { opacity: 0.3 }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          style={{ fontFamily: MONO, fontSize: "0.65rem", color: INSTITUTIONAL_GOLD, fontWeight: 800 }}
        >
          →
        </motion.span>
      ))}
    </div>
  );
}

export function KycPassportDoc() {
  return <IdentitySourceScreen copies={1} />;
}
export function LandDeedDoc() {
  return <ReferenceContextCard label="Chickasaw Project" sublabel="ABX-RE-LAND-006 · Land diligence" accent="#10B981" />;
}
export function RwaAssetDoc() {
  return <ReferenceContextCard label="Cielo Sunrise" sublabel="Hospitality" accent={INSTITUTIONAL_GOLD} />;
}
