"use client";
// FILE: components/home/cinematic/KycDocumentCards.tsx
// Institutional demo visuals — app screens, proof artifact, passport.

import { motion } from "framer-motion";
import { INSTITUTIONAL_GOLD, INSTITUTIONAL_GOLD_PALE, INSTITUTIONAL_VIOLET } from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const CARD_SHADOW = "0 20px 48px rgba(0,0,0,0.55)";

function DocShell({
  children,
  width,
  height,
  border = "1px solid rgba(255,255,255,0.1)",
  accent,
  className,
}: {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  border?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: width ?? "100%",
        height,
        borderRadius: 12,
        border: accent ? `1px solid ${accent}55` : border,
        background: "linear-gradient(165deg, rgba(22,18,30,0.98) 0%, rgba(8,8,14,0.99) 100%)",
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

/** Rising burden meter — verification debt accumulating */
export function VerificationDebtMeter({ count, max = 12 }: { count: number; max?: number }) {
  const pct = Math.min(100, (count / max) * 100);
  return (
    <div style={{ width: "100%", maxWidth: 340 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6, gap: 8, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: MONO, fontSize: "clamp(0.48rem, 1.4vw, 0.55rem)",
          color: "rgba(248,113,113,0.95)", letterSpacing: "0.1em", fontWeight: 700,
        }}>
          VERIFICATION DEBT
        </span>
        <motion.span
          key={count}
          initial={{ scale: 1.25, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            fontFamily: FONT, fontSize: "clamp(0.85rem, 2.5vw, 1rem)", fontWeight: 900,
            color: "#FCA5A5", letterSpacing: "-0.03em",
          }}
        >
          Same proof ×{count}
        </motion.span>
      </div>
      <div style={{
        height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(248,113,113,0.2)", overflow: "hidden",
      }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          style={{
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #F87171 0%, #FCA5A5 50%, rgba(248,113,113,0.5) 100%)",
            boxShadow: "0 0 12px rgba(248,113,113,0.45)",
          }}
        />
      </div>
    </div>
  );
}

/** Source identity — the one proof every platform re-requests */
export function IdentitySourceScreen({ copies = 3 }: { copies?: number }) {
  return (
    <DocShell width={118} height={108} accent={INSTITUTIONAL_VIOLET}>
      <div style={{
        padding: "5px 8px", borderBottom: "1px solid rgba(167,139,250,0.2)",
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(167,139,250,0.06)",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F87171" }} />
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: INSTITUTIONAL_GOLD, opacity: 0.6 }} />
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", opacity: 0.6 }} />
        <span style={{ fontFamily: MONO, fontSize: "0.34rem", color: "rgba(255,255,255,0.45)", marginLeft: "auto" }}>
          YOUR VAULT
        </span>
      </div>
      <div style={{ padding: "8px 9px" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.52rem", fontWeight: 800, color: "#FAFAFA", marginBottom: 6 }}>
          Identity + asset proof
        </div>
        {["Government ID", "Selfie / liveness", "Bank statements"].map((row, i) => (
          <div key={row} style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
            opacity: i < Math.min(copies, 3) ? 1 : 0.35,
          }}>
            <span style={{ fontSize: "0.5rem", color: "#10B981" }}>✓</span>
            <span style={{ fontFamily: FONT, fontSize: "0.4rem", color: "rgba(255,255,255,0.65)" }}>{row}</span>
          </div>
        ))}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{
            marginTop: 6, padding: "4px 6px", borderRadius: 6, textAlign: "center",
            border: "1px dashed rgba(232,197,71,0.35)", background: "rgba(232,197,71,0.06)",
            fontFamily: MONO, fontSize: "0.32rem", color: INSTITUTIONAL_GOLD_PALE,
          }}
        >
          Copied {copies}× today
        </motion.div>
      </div>
    </DocShell>
  );
}

const ACCENT_MAP = {
  violet: INSTITUTIONAL_VIOLET,
  gold: INSTITUTIONAL_GOLD,
} as const;

const PORTAL_ICONS: Record<string, string> = {
  "RWA marketplace": "◈",
  "Lender portal": "◇",
  "Hospitality ops": "✦",
};

/** App screen demanding the same verification again */
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
  const accentColor =
    accent === "violet" || accent === "gold" ? ACCENT_MAP[accent] : (accent as string);
  const portalIcon = icon ?? PORTAL_ICONS[name] ?? "▣";
  return (
    <motion.div
      className="cine-portal-card"
      animate={pulse ? {
        y: [0, -4, 0],
        boxShadow: [
          `0 14px 36px rgba(0,0,0,0.5)`,
          `0 20px 48px ${accentColor}40`,
          `0 14px 36px rgba(0,0,0,0.5)`,
        ],
      } : undefined}
      transition={pulse ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        width: "100%",
        minWidth: 100,
        maxWidth: 132,
        borderRadius: 12,
        border: pulse ? `1.5px solid ${accentColor}88` : `1px solid ${accentColor}44`,
        background: "linear-gradient(165deg, rgba(18,14,26,0.98) 0%, rgba(6,6,12,0.99) 100%)",
        boxShadow: pulse ? `0 0 24px ${accentColor}22` : "0 12px 32px rgba(0,0,0,0.45)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "absolute", inset: 0, zIndex: 2,
            background: "rgba(0,0,0,0.72)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 8,
          }}
        >
          <div style={{
            padding: "8px 10px", borderRadius: 10, width: "100%",
            border: `1px solid ${accentColor}66`,
            background: "linear-gradient(160deg, #1a1524, #0c0a12)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "0.75rem", marginBottom: 4 }}>↻</div>
            <div style={{ fontFamily: FONT, fontSize: "0.5rem", fontWeight: 800, color: "#fff" }}>
              Verify again
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.38rem", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              Re-upload required
            </div>
          </div>
        </motion.div>
      )}
      <div style={{
        padding: "5px 8px", borderBottom: `1px solid ${accentColor}22`,
        display: "flex", alignItems: "center", gap: 5,
        background: `linear-gradient(90deg, ${accentColor}14, transparent)`,
      }}>
        <span style={{ fontSize: "0.72rem" }}>{portalIcon}</span>
        <div style={{ minWidth: 0 }}>
          <span style={{
            display: "block",
            fontFamily: FONT, fontSize: "clamp(0.46rem, 1.3vw, 0.52rem)",
            fontWeight: 800, color: "#FAFAFA", letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            {name}
          </span>
          {context && (
            <span style={{
              display: "block",
              fontFamily: FONT, fontSize: "0.34rem", color: "rgba(255,255,255,0.42)",
              marginTop: 1,
            }}>
              {context}
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: "8px 9px 9px" }}>
        <div style={{
          padding: "5px 7px", borderRadius: 8, marginBottom: 6,
          border: "1px solid rgba(248,113,113,0.35)",
          background: "rgba(248,113,113,0.07)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.34rem", color: "rgba(248,113,113,0.9)", letterSpacing: "0.05em" }}>
            REQUESTING
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.42rem", color: "rgba(255,255,255,0.7)", marginTop: 3, lineHeight: 1.35 }}>
            ID · selfie · proof of address
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontFamily: FONT, fontSize: "0.42rem", fontWeight: 800,
            color: INSTITUTIONAL_GOLD, letterSpacing: "0.06em",
          }}>
            VERIFY AGAIN
          </span>
          {uploadN != null && (
            <span style={{
              fontFamily: MONO, fontSize: "0.36rem", padding: "2px 6px", borderRadius: 4,
              background: "rgba(248,113,113,0.15)", color: "#FCA5A5",
              border: "1px solid rgba(248,113,113,0.35)",
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

export function AbraxasPassportVc({ pulse = false, large = false }: { pulse?: boolean; large?: boolean }) {
  const w = large ? 188 : 168;
  const h = large ? 118 : 108;
  return (
    <motion.div
      animate={pulse ? {
        boxShadow: [
          `0 0 48px rgba(232,197,71,0.4), 0 24px 56px rgba(0,0,0,0.55)`,
          `0 0 80px rgba(232,197,71,0.55), 0 28px 64px rgba(0,0,0,0.6)`,
          `0 0 48px rgba(232,197,71,0.4), 0 24px 56px rgba(0,0,0,0.55)`,
        ],
      } : undefined}
      transition={pulse ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        width: w,
        height: h,
        borderRadius: 16,
        border: `2px solid ${INSTITUTIONAL_GOLD}`,
        background: "linear-gradient(155deg, #16121e 0%, #06090B 100%)",
        boxShadow: `0 0 56px rgba(232,197,71,0.35), 0 28px 52px rgba(0,0,0,0.55)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        position: "relative",
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        style={{
          position: "absolute", inset: -4, borderRadius: 20,
          border: `1px solid rgba(232,197,71,0.25)`,
          pointerEvents: "none",
        }}
      />
      <div style={{
        position: "absolute", top: 10, right: 10,
        width: 24, height: 24, borderRadius: "50%",
        background: "rgba(16,185,129,0.22)", border: "1px solid #10B981",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.7rem", color: "#10B981", fontWeight: 800,
      }}>
        ✓
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.48rem", letterSpacing: "0.14em", color: INSTITUTIONAL_VIOLET }}>
        ABRAXAS
      </div>
      <div style={{
        fontFamily: FONT,
        fontSize: large ? "1rem" : "0.92rem",
        fontWeight: 900,
        color: INSTITUTIONAL_GOLD_PALE,
        letterSpacing: "-0.03em",
      }}>
        Passport
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.54rem", color: "rgba(255,255,255,0.6)" }}>
        Verified once · portable
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.38rem", color: "rgba(16,185,129,0.9)", marginTop: 2 }}>
        W3C VC · ED25519
      </div>
    </motion.div>
  );
}

/** Hero authentication proof — independently verifiable */
export function AuthenticationProofArtifact({
  pulse = false,
  hero = false,
}: {
  pulse?: boolean;
  hero?: boolean;
}) {
  const width = hero ? "min(100%, 280px)" : 168;
  return (
    <motion.div
      className="cine-proof-hero"
      animate={pulse ? {
        boxShadow: [
          "0 0 40px rgba(232,197,71,0.3), 0 24px 56px rgba(0,0,0,0.55)",
          "0 0 72px rgba(16,185,129,0.4), 0 28px 64px rgba(0,0,0,0.6)",
          "0 0 40px rgba(232,197,71,0.3), 0 24px 56px rgba(0,0,0,0.55)",
        ],
      } : undefined}
      transition={pulse ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        width,
        borderRadius: 14,
        border: `2px solid ${INSTITUTIONAL_GOLD}`,
        background: "linear-gradient(155deg, #14101c 0%, #05070a 100%)",
        boxShadow: "0 0 48px rgba(232,197,71,0.28), 0 20px 48px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "6px 10px",
        borderBottom: "1px solid rgba(232,197,71,0.25)",
        background: "linear-gradient(90deg, rgba(232,197,71,0.12), rgba(16,185,129,0.08))",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
      }}>
        <span style={{
          fontFamily: MONO, fontSize: "clamp(0.4rem, 1.2vw, 0.46rem)",
          letterSpacing: "0.12em", color: INSTITUTIONAL_GOLD, fontWeight: 700,
        }}>
          AUTHENTICATION PROOF
        </span>
        <span style={{
          fontFamily: MONO, fontSize: "0.34rem", padding: "2px 6px", borderRadius: 4,
          background: "rgba(16,185,129,0.2)", color: "#6EE7B7",
          border: "1px solid rgba(16,185,129,0.4)",
        }}>
          INDEPENDENT VERIFY
        </span>
      </div>
      <div style={{ padding: "10px 11px 11px" }}>
        <div style={{
          fontFamily: MONO,
          fontSize: hero ? "clamp(0.58rem, 1.8vw, 0.68rem)" : "0.5rem",
          color: INSTITUTIONAL_GOLD_PALE,
          marginBottom: 8,
          letterSpacing: "-0.02em",
          wordBreak: "break-all",
        }}>
          aprx_7f3a9c2e1b4d8f6a
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            "ED25519 SIGNED",
            "signature_valid: true",
            "SUI ANCHOR · optional",
          ].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 14, height: 14, borderRadius: 4, fontSize: "0.5rem",
                background: "rgba(16,185,129,0.2)", color: "#10B981",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
              }}>✓</span>
              <span style={{
                fontFamily: MONO,
                fontSize: "clamp(0.34rem, 1vw, 0.38rem)",
                color: "rgba(255,255,255,0.65)",
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
        {!hero && <NoRelayBadge compact />}
      </div>
    </motion.div>
  );
}

export function NoRelayBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      marginTop: compact ? 0 : 9, padding: compact ? "4px 7px" : "5px 8px", borderRadius: 8,
      background: "rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      <span style={{ fontSize: "0.65rem", opacity: 0.45, textDecoration: "line-through" }}>✉</span>
      <span style={{
        fontFamily: FONT, fontSize: "clamp(0.36rem, 1vw, 0.42rem)",
        fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.02em",
      }}>
        No inbox · no relay · no trust required
      </span>
    </div>
  );
}

export function ReferenceContextCard({
  label = "Cielo Sunrise",
  sublabel = "ABX-RE-HOSP-001 · Hospitality",
  accent = INSTITUTIONAL_GOLD,
}: {
  label?: string;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <DocShell width={120} height={58} accent={accent}>
      <div style={{ padding: "6px 9px" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.32rem", color: accent,
          letterSpacing: "0.08em", marginBottom: 3, fontWeight: 700,
        }}>
          REFERENCE
        </div>
        <div style={{
          fontFamily: FONT, fontSize: "clamp(0.5rem, 1.4vw, 0.58rem)",
          fontWeight: 800, color: "#FAFAFA", lineHeight: 1.2,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: "0.38rem", color: "rgba(255,255,255,0.48)",
          marginTop: 2, lineHeight: 1.3,
        }}>
          {sublabel}
        </div>
      </div>
    </DocShell>
  );
}

export function CounterpartyVerifierCard({
  label = "Cielo operator",
  active = false,
}: {
  label?: string;
  active?: boolean;
}) {
  return (
    <motion.div
      animate={active ? {
        boxShadow: [
          "0 20px 48px rgba(0,0,0,0.55)",
          "0 0 32px rgba(16,185,129,0.35), 0 24px 56px rgba(0,0,0,0.55)",
          "0 20px 48px rgba(0,0,0,0.55)",
        ],
      } : undefined}
      transition={active ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
    <DocShell width="100%" height={108} accent="#10B981">
      <div style={{ padding: "8px 10px", textAlign: "center" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, margin: "0 auto 6px",
          background: "rgba(16,185,129,0.22)", border: "1px solid rgba(16,185,129,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden fill="none">
            <path d="M2 7l3 3 7-7" stroke="#6EE7B7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{
          fontFamily: FONT, fontSize: "clamp(0.54rem, 1.5vw, 0.62rem)",
          fontWeight: 800, color: "#FAFAFA",
        }}>
          {label}
        </div>
        <div style={{
          marginTop: 6, padding: "6px 8px", borderRadius: 8,
          background: active ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.18)",
          border: `1px solid rgba(16,185,129,${active ? "0.65" : "0.45"})`,
        }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.36rem", color: "#6EE7B7",
            letterSpacing: "0.06em", fontWeight: 700,
          }}>
            {active ? "DECISION: APPROVED" : "PENDING VERIFY"}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: "0.32rem", color: "rgba(255,255,255,0.5)",
            marginTop: 4,
          }}>
            GET /api/proof/…
          </div>
        </div>
      </div>
    </DocShell>
    </motion.div>
  );
}

export function ConnectionBeam({
  vertical = false,
  active = true,
}: {
  vertical?: boolean;
  active?: boolean;
}) {
  if (vertical) {
    return (
      <svg width="24" height={active ? 40 : 28} viewBox="0 0 24 40" aria-hidden style={{ overflow: "visible", opacity: active ? 1 : 0.25 }}>
        <motion.path
          d="M 12 0 Q 16 20 12 40"
          fill="none"
          stroke="url(#beamV)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0.3, opacity: 0.35 }}
          transition={{ duration: 0.7, type: "spring", stiffness: 80 }}
        />
        <defs>
          <linearGradient id="beamV" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8C547" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  return (
    <svg width="52" height="28" viewBox="0 0 52 28" aria-hidden style={{ overflow: "visible", flexShrink: 0, opacity: active ? 1 : 0.25 }}>
      <motion.path
        d="M 0 14 Q 26 2 52 14"
        fill="none"
        stroke="url(#beamH)"
        strokeWidth="2.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0.3, opacity: 0.35 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 80 }}
      />
      <motion.circle
        r="3"
        fill={INSTITUTIONAL_GOLD}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1], offsetDistance: "100%" }}
        style={{ offsetPath: 'path("M 0 14 Q 26 2 52 14")' }}
      />
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
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", padding: "0 4px" }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={active ? { opacity: [0.25, 1, 0.25], x: [0, 6, 12] } : { opacity: 0.3 }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          style={{ display: "flex", alignItems: "center", gap: 2 }}
        >
          <span style={{ fontFamily: MONO, fontSize: "0.5rem", color: INSTITUTIONAL_GOLD }}>→</span>
          <span style={{ fontFamily: MONO, fontSize: "0.5rem", color: INSTITUTIONAL_GOLD }}>→</span>
        </motion.div>
      ))}
    </div>
  );
}

// Legacy exports for any other imports
export function KycPassportDoc() {
  return <IdentitySourceScreen copies={1} />;
}
export function LandDeedDoc() {
  return <ReferenceContextCard label="Chickasaw Project" sublabel="Land diligence" accent="#10B981" />;
}
export function RwaAssetDoc() {
  return <ReferenceContextCard label="Cielo Sunrise" sublabel="Hospitality" accent={INSTITUTIONAL_GOLD} />;
}
