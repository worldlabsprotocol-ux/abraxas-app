"use client";

import { motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { OrbitNode } from "@/components/home/cinematic/DemoVisualPrimitives";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACT_MS = [4500, 4500, 4500, 4500];

const NODES = [
  { label: "Marketplace", angle: -90, step: 1 },
  { label: "Lender", angle: 0, step: 2 },
  { label: "Hospitality", angle: 90, step: 3 },
  { label: "ATS", angle: 180, step: 4 },
];

export function NetworkEffectCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const connected = NODES.filter(n => n.step <= act).length;
  const moatPct = Math.round((connected / NODES.length) * 100);

  const actLabel = `Relying party ${act}`;
  const actCaption =
    act === 1
      ? "First external app accepts Passport — zero document resend."
      : act === 2
        ? "Second acceptance doubles portability — same credential, new policy."
        : act === 3
          ? "Each new relying party is the moat. Network value compounds."
          : `${connected} accepting · ${moatPct}% network coverage on this loop.`;

  const radius = compact ? 72 : 88;

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
      variant="constellation"
      compact={compact}
      minHeight={compact ? 260 : 320}
    >
      <div className="relative flex h-full items-center justify-center">
        {/* Connection lines */}
        <svg
          className="pointer-events-none absolute"
          width={radius * 2 + 120}
          height={radius * 2 + 120}
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
          aria-hidden
        >
          {NODES.filter(n => n.step <= act).map(n => {
            const rad = (n.angle * Math.PI) / 180;
            const cx = radius + 60 + Math.cos(rad) * radius;
            const cy = radius + 60 + Math.sin(rad) * radius;
            return (
              <motion.line
                key={n.label}
                x1={radius + 60}
                y1={radius + 60}
                x2={cx}
                y2={cy}
                stroke="rgba(167,139,250,0.45)"
                strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
              />
            );
          })}
        </svg>

        {/* Hub */}
        <motion.div
          animate={{ boxShadow: ["0 0 32px rgba(167,139,250,0.2)", "0 0 56px rgba(167,139,250,0.35)", "0 0 32px rgba(167,139,250,0.2)"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: actEase }}
          style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            width: compact ? 64 : 76, height: compact ? 64 : 76, borderRadius: "50%",
            border: "2px solid rgba(167,139,250,0.55)",
            background: "radial-gradient(circle, rgba(167,139,250,0.25) 0%, rgba(18,15,28,0.95) 70%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 2, zIndex: 2,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: "0.32rem", color: "#C4B5FD", letterSpacing: "0.06em" }}>
            NETWORK
          </span>
          <span style={{ fontFamily: FONT, fontSize: "0.55rem", fontWeight: 900, color: "#EDE9FE" }}>
            {connected}
          </span>
        </motion.div>

        {NODES.map(n => (
          <OrbitNode
            key={n.label}
            label={n.label}
            angle={n.angle}
            radius={radius}
            active={n.step <= act}
            pulse={n.step === act && actProgress > 0.2}
          />
        ))}

        <div style={{
          position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
          fontFamily: MONO, fontSize: "0.36rem", color: "rgba(196,181,253,0.65)",
          letterSpacing: "0.08em", whiteSpace: "nowrap",
        }}>
          MOAT GROWS WITH EACH ACCEPTING APPLICATION
        </div>
      </div>
    </CinematicDemoShell>
  );
}
