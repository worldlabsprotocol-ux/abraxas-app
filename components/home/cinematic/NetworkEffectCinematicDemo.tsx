"use client";

import { motion } from "framer-motion";
import { AbraxasPassportVc } from "@/components/home/cinematic/KycDocumentCards";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { INSTITUTIONAL_GOLD, INSTITUTIONAL_VIOLET } from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACT_MS = [5000, 5000, 5000, 5000];

const APPS = [
  { name: "Marketplace", step: 1 },
  { name: "Lender", step: 2 },
  { name: "Hospitality", step: 3 },
  { name: "ATS / exchange", step: 4 },
];

export function NetworkEffectCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const accepting = APPS.filter(a => a.step <= act).length;

  const actLabel = APPS[act - 1]?.name ?? "Network";
  const actCaption =
    act === 1
      ? "First issuer verifies — attested once, separate claims per scope."
      : act === 2
        ? "First app accepts Passport — no document resend."
        : act === 3
          ? "Second app accepts Passport — each relying party compounds the moat."
          : "More accepting applications → more valuable Passport.";

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={actLabel}
      actCaption={actCaption}
      elapsed={elapsed}
      totalMs={totalMs}
      reducedMotion={reducedMotion}
      mood="success"
      compact={compact}
      minHeight={compact ? 260 : 320}
    >
      <div className="relative flex h-full flex-col items-center justify-center">
        <div style={{
          position: "absolute", top: 8, right: 8,
          fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
          color: INSTITUTIONAL_GOLD, padding: "4px 8px", borderRadius: 8,
          border: "1px solid rgba(232,197,71,0.35)", background: "rgba(232,197,71,0.08)",
        }}>
          {accepting} accepting
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(90px, 1fr))",
          gap: "0.65rem",
          width: "100%",
          maxWidth: 380,
          alignItems: "center",
          justifyItems: "center",
        }}>
          {APPS.map((app, i) => {
            const lit = app.step <= act;
            const pulse = app.step === act && actProgress > 0.2;
            return (
              <motion.div
                key={app.name}
                initial={{ opacity: 0.2, scale: 0.92 }}
                animate={{
                  opacity: lit ? 1 : 0.25,
                  scale: pulse ? [1, 1.04, 1] : lit ? 1 : 0.92,
                }}
                transition={pulse ? { duration: 1.4, repeat: Infinity } : { duration: 0.45 }}
                style={{
                  padding: "0.55rem 0.65rem",
                  borderRadius: 10,
                  border: `1px solid ${lit ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)"}`,
                  background: lit ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.02)",
                  textAlign: "center",
                  gridColumn: i === 1 ? "span 2" : undefined,
                  justifySelf: i === 1 ? "center" : undefined,
                  width: i === 1 ? "min(100%, 160px)" : "100%",
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: "0.34rem", color: lit ? "#6EE7B7" : "rgba(255,255,255,0.35)" }}>
                  {lit ? "ACCEPTS PASSPORT" : "PENDING"}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, color: "#FAFAFA", marginTop: 4 }}>
                  {app.name}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          style={{ margin: "1rem 0 0.5rem" }}
          animate={{ scale: actProgress > 0.15 ? [1, 1.03, 1] : 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: actEase }}
        >
          <AbraxasPassportVc pulse={act >= 2} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: act >= 2 ? 1 : 0 }}
          style={{
            fontFamily: MONO, fontSize: "0.4rem", color: INSTITUTIONAL_VIOLET,
            letterSpacing: "0.06em",
          }}
        >
          ONE CREDENTIAL · MANY RELYING PARTIES
        </motion.div>
      </div>
    </CinematicDemoShell>
  );
}
