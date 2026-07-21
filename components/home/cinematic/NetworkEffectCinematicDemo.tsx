"use client";

import { motion } from "framer-motion";
import { CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { OrbitHub, PremiumStat } from "@/components/home/cinematic/PremiumDemoPrimitives";
import { ACCENT } from "@/components/home/cinematic/demoPremium";

const ACT_MS = [4500, 4500, 4500, 4500];

const NODE_DEFS = [
  { name: "Marketplace", angle: -90 },
  { name: "Lender", angle: 0 },
  { name: "Hospitality", angle: 90 },
  { name: "ATS", angle: 180 },
];

export function NetworkEffectCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount } = useCinematicTimer(ACT_MS);

  const connected = act;
  const captions = [
    "First relying party accepts Passport. Zero document resend.",
    "Second acceptance — same credential, new policy.",
    "Each new app is the moat. Network value compounds.",
    "North star: relying parties in production, not sandbox demos.",
  ];
  const labels = ["1st RP", "2nd RP", "3rd RP", "Moat"];

  const nodes = NODE_DEFS.map((n, i) => ({
    ...n,
    active: i < connected,
  }));

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={labels[act - 1] ?? ""}
      actCaption={captions[act - 1] ?? ""}
      variant="constellation"
      compact={compact}
      minHeight={compact ? 280 : 340}
    >
      <div className="flex flex-col items-center gap-4">
        <OrbitHub
          count={connected}
          label="ACCEPTING"
          nodes={nodes}
          accent={ACCENT.violet}
          radius={compact ? 76 : 92}
        />
        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <PremiumStat value={`${connected}`} label="Relying parties" accent={ACCENT.violet} pulse />
          <PremiumStat value={`${connected * 25}%`} label="Network moat" accent={ACCENT.violet} />
        </motion.div>
      </div>
    </CinematicDemoShell>
  );
}
