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
    <DocShell width={88} height={64} accent={repeat ? "#F59E0B" : undefined}>
      <div style={{ padding: "6px 7px", textAlign: "center" }}>
        <div style={{ fontSize: "0.65rem", marginBottom: 2 }}>{repeat ? "⚠" : "○"}</div>
        <div style={{ fontFamily: FONT, fontSize: "0.46rem", fontWeight: 800, color: repeat ? "#FBBF24" : "#fff" }}>
          Verify Identity
        </div>
        <div style={{
          marginTop: 5, padding: "3px 8px", borderRadius: 999,
          background: repeat ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.1)",
          fontFamily: FONT, fontSize: "0.38rem", fontWeight: 700,
          color: repeat ? "#FCD34D" : "rgba(255,255,255,0.6)",
        }}>
          Submit again
        </div>
      </div>
    </DocShell>
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

/** Third party — verifies credential without re-KYC */
export function CounterpartyVerifierCard({ label = "Lender" }: { label?: string }) {
  return (
    <DocShell width={108} height={92} accent="#10B981">
      <div style={{ padding: "8px 9px", textAlign: "center" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, margin: "0 auto 6px",
          background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none">
            <rect x="1" y="5" width="12" height="8" rx="1" stroke="#6EE7B7" strokeWidth="1.2" />
            <path d="M4 5V3.5a3 3 0 0 1 6 0V5" stroke="#6EE7B7" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="7" cy="9" r="1" fill="#6EE7B7" />
          </svg>
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 800, color: "#FAFAFA" }}>
          {label}
        </div>
        <div style={{
          marginTop: 6, padding: "4px 6px", borderRadius: 6,
          background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.38rem", color: "#6EE7B7", letterSpacing: "0.04em" }}>
            CRYPTO VERIFIED ✓
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.36rem", color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
            No re-KYC
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
