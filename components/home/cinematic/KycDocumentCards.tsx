"use client";
// FILE: components/home/cinematic/KycDocumentCards.tsx
// Realistic KYC / RWA document visuals — SVG + CSS, no PNGs.

import { motion } from "framer-motion";
import { INSTITUTIONAL_GOLD, INSTITUTIONAL_GOLD_PALE, INSTITUTIONAL_VIOLET } from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const CARD_SHADOW = "0 16px 40px rgba(0,0,0,0.55)";

function DocShell({
  children,
  width,
  height,
  border = "1px solid rgba(255,255,255,0.12)",
  accent,
}: {
  children: React.ReactNode;
  width: number;
  height: number;
  border?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 10,
        border: accent ? `1px solid ${accent}55` : border,
        background: "linear-gradient(160deg, #1a1a22 0%, #0c0c12 100%)",
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

export function KycPassportDoc() {
  return (
    <DocShell width={118} height={82}>
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{
          width: 38, background: "linear-gradient(180deg, #3d3028 0%, #2a221c 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 22, height: 28, borderRadius: 4, background: "rgba(255,255,255,0.12)" }} />
        </div>
        <div style={{ flex: 1, padding: "6px 8px" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.42rem", letterSpacing: "0.1em", color: INSTITUTIONAL_GOLD, marginBottom: 4 }}>
            PASSPORT
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginBottom: 3, width: "90%" }} />
          <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, marginBottom: 3, width: "75%" }} />
          <div style={{ fontFamily: MONO, fontSize: "0.38rem", color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
            P&lt;USA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </div>
        </div>
      </div>
    </DocShell>
  );
}

export function KycDriverLicenseDoc() {
  return (
    <DocShell width={108} height={68} accent="#4285F4">
      <div style={{ padding: "5px 7px" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.4rem", color: "#60A5FA", letterSpacing: "0.08em" }}>DRIVER LICENSE</div>
        <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
          <div style={{ width: 24, height: 30, borderRadius: 3, background: "rgba(66,133,244,0.2)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 2, marginBottom: 3 }} />
            <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, width: "80%" }} />
            <div style={{ fontFamily: MONO, fontSize: "0.36rem", color: "rgba(255,255,255,0.3)", marginTop: 5 }}>EXP 2028</div>
          </div>
        </div>
      </div>
    </DocShell>
  );
}

export function KycSsnFormDoc() {
  return (
    <DocShell width={96} height={72} accent="#F87171">
      <div style={{ padding: "7px 8px" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.48rem", fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
          Tax ID / SSN
        </div>
        <div style={{
          marginTop: 6, padding: "5px 6px", borderRadius: 6,
          border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.08)",
          fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.55)",
        }}>
          •••-••-1234
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.38rem", color: "rgba(248,113,113,0.7)", marginTop: 5 }}>
          Re-enter required
        </div>
      </div>
    </DocShell>
  );
}

export function KycVerifyModalDoc({ repeat }: { repeat?: boolean }) {
  return (
    <DocShell width={88} height={64} accent={repeat ? INSTITUTIONAL_GOLD : undefined}>
      <div style={{ padding: "6px 7px", textAlign: "center" }}>
        <div style={{ fontSize: "0.65rem", marginBottom: 2 }}>{repeat ? "↻" : "○"}</div>
        <div style={{ fontFamily: FONT, fontSize: "0.46rem", fontWeight: 800, color: repeat ? INSTITUTIONAL_GOLD_PALE : "#fff" }}>
          Verify Identity
        </div>
        <div style={{
          marginTop: 5, padding: "3px 8px", borderRadius: 999,
          background: repeat ? "rgba(232,197,71,0.18)" : "rgba(255,255,255,0.1)",
          fontFamily: FONT, fontSize: "0.38rem", fontWeight: 700,
          color: repeat ? INSTITUTIONAL_GOLD : "rgba(255,255,255,0.6)",
        }}>
          Submit again
        </div>
      </div>
    </DocShell>
  );
}

/** Institutional app portal — each platform re-requests the same proof */
export function AppVerificationPortal({
  name,
  icon,
  accent = INSTITUTIONAL_VIOLET,
  pulse = false,
  uploadN,
}: {
  name: string;
  icon: string;
  accent?: string;
  pulse?: boolean;
  uploadN?: number;
}) {
  return (
    <motion.div
      animate={pulse ? { y: [0, -3, 0], boxShadow: [
        `0 12px 32px rgba(0,0,0,0.45)`,
        `0 16px 40px ${accent}33`,
        `0 12px 32px rgba(0,0,0,0.45)`,
      ] } : undefined}
      transition={pulse ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        width: 108,
        borderRadius: 12,
        border: `1px solid ${accent}44`,
        background: "linear-gradient(165deg, rgba(20,16,28,0.95) 0%, rgba(8,8,14,0.98) 100%)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "5px 8px",
        borderBottom: `1px solid ${accent}22`,
        display: "flex", alignItems: "center", gap: 5,
        background: `linear-gradient(90deg, ${accent}12, transparent)`,
      }}>
        <span style={{ fontSize: "0.7rem" }}>{icon}</span>
        <span style={{ fontFamily: FONT, fontSize: "0.48rem", fontWeight: 800, color: "#FAFAFA", letterSpacing: "-0.02em" }}>
          {name}
        </span>
      </div>
      <div style={{ padding: "7px 8px 8px" }}>
        <div style={{
          padding: "4px 6px", borderRadius: 6, marginBottom: 5,
          border: "1px dashed rgba(248,113,113,0.35)",
          background: "rgba(248,113,113,0.06)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.34rem", color: "rgba(248,113,113,0.85)", letterSpacing: "0.06em" }}>
            ID · SELFIE · PROOF OF ADDR
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4,
        }}>
          <span style={{
            fontFamily: FONT, fontSize: "0.4rem", fontWeight: 800,
            color: INSTITUTIONAL_GOLD, letterSpacing: "0.04em",
          }}>
            VERIFY AGAIN
          </span>
          {uploadN != null && (
            <span style={{
              fontFamily: MONO, fontSize: "0.34rem", padding: "2px 5px", borderRadius: 4,
              background: "rgba(232,197,71,0.12)", color: INSTITUTIONAL_GOLD_PALE,
              border: "1px solid rgba(232,197,71,0.28)",
            }}>
              #{uploadN}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Animated burden counter — uploads stacking across apps */
export function VerificationBurdenCounter({ count }: { count: number }) {
  return (
    <div style={{
      padding: "6px 12px", borderRadius: 999,
      border: "1px solid rgba(248,113,113,0.35)",
      background: "rgba(248,113,113,0.08)",
      display: "inline-flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ fontFamily: MONO, fontSize: "0.42rem", color: "rgba(248,113,113,0.9)", letterSpacing: "0.08em" }}>
        SAME DOCUMENTS
      </span>
      <motion.span
        key={count}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 900,
          color: "#FCA5A5", minWidth: 28, textAlign: "center",
        }}
      >
        ×{count}
      </motion.span>
    </div>
  );
}

/** Compact document stack being copied to each portal */
export function DocumentStackMini({ copies }: { copies: number }) {
  return (
    <div style={{ position: "relative", width: 72, height: 56 }}>
      {Array.from({ length: Math.min(copies, 4) }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: i * 4,
            top: i * 3,
            width: 56,
            height: 40,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "linear-gradient(160deg, #1a1a22 0%, #0c0c12 100%)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            opacity: 1 - i * 0.12,
          }}
        >
          <div style={{ padding: "4px 5px" }}>
            <div style={{ height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 1, marginBottom: 2, width: "80%" }} />
            <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1, width: "60%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AbraxasPassportVc({ pulse = false }: { pulse?: boolean }) {
  return (
    <motion.div
      animate={pulse ? { boxShadow: [
        `0 0 40px rgba(232,197,71,0.35), 0 20px 48px rgba(0,0,0,0.5)`,
        `0 0 70px rgba(232,197,71,0.5), 0 24px 56px rgba(0,0,0,0.55)`,
        `0 0 40px rgba(232,197,71,0.35), 0 20px 48px rgba(0,0,0,0.5)`,
      ] } : undefined}
      transition={pulse ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        width: 168,
        height: 108,
        borderRadius: 14,
        border: `2px solid ${INSTITUTIONAL_GOLD}`,
        background: "linear-gradient(155deg, #141018 0%, #06090B 100%)",
        boxShadow: `0 0 48px rgba(232,197,71,0.38), 0 24px 48px rgba(0,0,0,0.5)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        position: "relative",
      }}
    >
      <div style={{
        position: "absolute", top: 8, right: 8,
        width: 22, height: 22, borderRadius: "50%",
        background: "rgba(16,185,129,0.2)", border: "1px solid #10B981",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.65rem", color: "#10B981", fontWeight: 800,
      }}>
        ✓
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.46rem", letterSpacing: "0.12em", color: INSTITUTIONAL_VIOLET }}>
        ABRAXAS
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 900, color: INSTITUTIONAL_GOLD_PALE }}>
        Passport
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.52rem", color: "rgba(255,255,255,0.55)" }}>
        Verified once ✓
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.4rem", color: "rgba(16,185,129,0.85)", marginTop: 2 }}>
        Identity · Portable · W3C VC
      </div>
    </motion.div>
  );
}

export function LandDeedDoc() {
  return (
    <DocShell width={130} height={88} accent="#10B981">
      <div style={{ padding: "7px 9px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.42rem", color: "#10B981", letterSpacing: "0.06em" }}>
            PROPERTY TITLE
          </div>
          <div style={{
            fontFamily: MONO, fontSize: "0.34rem", padding: "2px 5px", borderRadius: 4,
            background: "rgba(16,185,129,0.2)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.4)",
          }}>
            VERIFIED
          </div>
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, color: "#FAFAFA", margin: "5px 0 3px" }}>
          Chickasaw Project
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.44rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.45 }}>
          Lot 4 · Mineral rights · OK
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.36rem", color: INSTITUTIONAL_GOLD, marginTop: 6 }}>
          Abraxas Verified ✓
        </div>
      </div>
    </DocShell>
  );
}

export function RwaAssetDoc() {
  return (
    <DocShell width={130} height={88} accent={INSTITUTIONAL_GOLD}>
      <div style={{ padding: "7px 9px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.42rem", color: INSTITUTIONAL_GOLD, letterSpacing: "0.06em" }}>
            TOKENIZED RWA
          </div>
          <div style={{
            fontFamily: MONO, fontSize: "0.34rem", padding: "2px 5px", borderRadius: 4,
            background: "rgba(232,197,71,0.15)", color: INSTITUTIONAL_GOLD_PALE,
          }}>
            LIVE
          </div>
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, color: "#FAFAFA", margin: "5px 0 3px" }}>
          Cielo Sunrise
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.44rem", color: "rgba(255,255,255,0.5)" }}>
          STR · USDC settle · Verified guest
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.36rem", color: "#10B981", marginTop: 6 }}>
          Compliance: Passport linked
        </div>
      </div>
    </DocShell>
  );
}

/** On-chain authentication proof — core Abraxas artifact */
export function AuthenticationProofArtifact({ pulse = false }: { pulse?: boolean }) {
  return (
    <motion.div
      animate={pulse ? {
        boxShadow: [
          "0 0 32px rgba(232,197,71,0.25), 0 16px 40px rgba(0,0,0,0.5)",
          "0 0 56px rgba(16,185,129,0.35), 0 20px 48px rgba(0,0,0,0.55)",
          "0 0 32px rgba(232,197,71,0.25), 0 16px 40px rgba(0,0,0,0.5)",
        ],
      } : undefined}
      transition={pulse ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        width: 156,
        borderRadius: 12,
        border: `1.5px solid ${INSTITUTIONAL_GOLD}`,
        background: "linear-gradient(155deg, #12101a 0%, #06080c 100%)",
        boxShadow: "0 0 40px rgba(232,197,71,0.22), 0 16px 40px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "5px 8px",
        borderBottom: "1px solid rgba(232,197,71,0.22)",
        background: "rgba(232,197,71,0.08)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: MONO, fontSize: "0.38rem", letterSpacing: "0.1em", color: INSTITUTIONAL_GOLD }}>
          AUTH PROOF
        </span>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            fontFamily: MONO, fontSize: "0.32rem", padding: "2px 5px", borderRadius: 4,
            background: "rgba(16,185,129,0.15)", color: "#6EE7B7",
            border: "1px solid rgba(16,185,129,0.35)",
          }}
        >
          SUI · ANCHOR
        </motion.span>
      </div>
      <div style={{ padding: "8px 9px 9px" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: INSTITUTIONAL_GOLD_PALE, marginBottom: 5, letterSpacing: "-0.02em" }}>
          aprx_7f3a9c2e1b4d8f6a
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: "0.55rem", color: "#10B981" }}>✓</span>
            <span style={{ fontFamily: MONO, fontSize: "0.34rem", color: "rgba(255,255,255,0.55)" }}>
              ED25519 SIGNED
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: "0.55rem", color: "#10B981" }}>✓</span>
            <span style={{ fontFamily: MONO, fontSize: "0.34rem", color: "rgba(255,255,255,0.55)" }}>
              PAYLOAD HASH MATCH
            </span>
          </div>
        </div>
        <div style={{
          marginTop: 7, padding: "4px 6px", borderRadius: 6,
          border: "1px dashed rgba(255,255,255,0.12)",
          fontFamily: FONT, fontSize: "0.34rem", color: "rgba(255,255,255,0.45)",
          textAlign: "center",
        }}>
          No email · no relay
        </div>
      </div>
    </motion.div>
  );
}

/** Compact reference context — diligence or booking triggers proof */
export function ReferenceContextCard({
  label,
  sublabel,
  accent = "#10B981",
}: {
  label: string;
  sublabel: string;
  accent?: string;
}) {
  return (
    <DocShell width={112} height={64} accent={accent}>
      <div style={{ padding: "6px 8px" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.34rem", color: accent, letterSpacing: "0.06em", marginBottom: 3 }}>
          REFERENCE LOOP
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.56rem", fontWeight: 800, color: "#FAFAFA", lineHeight: 1.2 }}>
          {label}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.4rem", color: "rgba(255,255,255,0.5)", marginTop: 3, lineHeight: 1.35 }}>
          {sublabel}
        </div>
      </div>
    </DocShell>
  );
}

/** Third party — verifies proof artifact without re-KYC */
export function CounterpartyVerifierCard({ label = "Lender" }: { label?: string }) {
  return (
    <DocShell width={118} height={100} accent="#10B981">
      <div style={{ padding: "7px 9px", textAlign: "center" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, margin: "0 auto 5px",
          background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none">
            <path d="M2 7l3 3 7-7" stroke="#6EE7B7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 800, color: "#FAFAFA" }}>
          {label}
        </div>
        <div style={{
          marginTop: 5, padding: "5px 6px", borderRadius: 6,
          background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.34rem", color: "#6EE7B7", letterSpacing: "0.04em" }}>
            DECISION: APPROVED
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.32rem", color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
            GET /api/proof/…
          </div>
        </div>
      </div>
    </DocShell>
  );
}

export function ConnectionBeam() {
  return (
    <svg width="48" height="24" viewBox="0 0 48 24" aria-hidden style={{ overflow: "visible" }}>
      <motion.path
        d="M 0 12 Q 24 4 48 12"
        fill="none"
        stroke="url(#beam)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 80 }}
      />
      <defs>
        <linearGradient id="beam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E8C547" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
