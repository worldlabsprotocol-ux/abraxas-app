"use client";

import { motion } from "framer-motion";
import { actEase, CinematicDemoShell } from "@/components/home/cinematic/CinematicDemoShell";
import { useCinematicTimer } from "@/components/home/cinematic/useCinematicTimer";
import { BlueprintLayer } from "@/components/home/cinematic/DemoVisualPrimitives";

const ACT_MS = [5500, 5500, 5500];

const LAYERS = [
  { label: "Abraxas — trust infrastructure", sub: "Passport · verify API · policy engine", highlight: true, width: 92 },
  { label: "Issuance & tokenization", sub: "Figure · Ondo · Plume · Centrifuge", highlight: false, width: 84 },
  { label: "Applications & distribution", sub: "Marketplaces · lenders · embedded finance", highlight: false, width: 76 },
];

export function StackLayerCinematicDemo({ compact = false }: { compact?: boolean }) {
  const { containerRef, elapsed, totalMs, act, actCount, actProgress, reducedMotion } =
    useCinematicTimer(ACT_MS);

  const actLabel =
    act === 1 ? "Foundation" : act === 2 ? "Issuance layer" : "Full stack";

  const actCaption =
    act === 1
      ? "Trust infrastructure is the foundation — identity and diligence verified once."
      : act === 2
        ? "Issuers mint on-chain; they should not rebuild compliance per app."
        : "Every application plugs into the same verification layer underneath.";

  const visibleLayers =
    act === 1 ? LAYERS.slice(0, 1) : act === 2 ? LAYERS.slice(0, 2) : LAYERS;

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
      variant="blueprint"
      compact={compact}
      minHeight={compact ? 250 : 310}
    >
      <div className="flex h-full flex-col items-center justify-end pb-2" style={{ gap: 4 }}>
        {visibleLayers.map((layer, i) => (
          <BlueprintLayer
            key={layer.label}
            label={layer.label}
            sublabel={layer.sub}
            widthPct={layer.width}
            depth={visibleLayers.length - i}
            highlight={layer.highlight && act >= 1}
            delay={i * 0.08}
          />
        ))}
        {act === 3 && actProgress > 0.4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: "absolute", top: "12%",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.38rem", color: "rgba(147,197,253,0.7)",
              letterSpacing: "0.12em",
            }}
          >
            ↑ ALL APPS SHARE ONE TRUST LAYER
          </motion.div>
        )}
      </div>
    </CinematicDemoShell>
  );
}
