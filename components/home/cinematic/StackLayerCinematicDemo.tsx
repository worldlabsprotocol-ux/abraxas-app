"use client";

import { motion } from "framer-motion";
import { CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { StackSlab } from "@/components/home/cinematic/PremiumDemoPrimitives";
import { ACCENT } from "@/components/home/cinematic/demoPremium";

const ACT_MS = [5500, 5500, 5500];

const LAYERS = [
  { label: "Abraxas — trust layer", sub: "Verify once · reuse everywhere", width: 94, foundation: true },
  { label: "Issuance & tokenization", sub: "Structure · mint · compliance scope", width: 82, foundation: false },
  { label: "Apps & distribution", sub: "Marketplaces · lenders · embedded finance", width: 70, foundation: false },
];

export function StackLayerCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, act, actCount } = useCinematicTimer(ACT_MS);

  const captions = [
    "Who sits underneath all of them? The trust layer.",
    "Issuers mint assets — they shouldn't rebuild compliance per app.",
    "Every application plugs into the same verification foundation.",
  ];
  const labels = ["Foundation", "Issuance", "Full stack"];

  const visible = act === 1 ? 1 : act === 2 ? 2 : 3;

  return (
    <CinematicDemoShell
      containerRef={containerRef}
      act={act}
      actCount={actCount}
      actLabel={labels[act - 1] ?? ""}
      actCaption={captions[act - 1] ?? ""}
      variant="blueprint"
      compact={compact}
      minHeight={compact ? 250 : 300}
    >
      <div className="flex h-full flex-col items-center justify-end gap-2 pb-2">
        {LAYERS.slice(0, visible).reverse().map((layer, i) => (
          <StackSlab
            key={layer.label}
            label={layer.label}
            sub={layer.sub}
            widthPct={layer.width}
            accent={ACCENT.ice}
            foundation={layer.foundation}
            delay={i * 0.1}
          />
        ))}
        {act === 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: "absolute", top: "8%",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.42rem", letterSpacing: "0.14em",
              color: "rgba(147,197,253,0.7)",
            }}
          >
            INFRASTRUCTURE — NOT ANOTHER MARKETPLACE
          </motion.div>
        )}
      </div>
    </CinematicDemoShell>
  );
}
