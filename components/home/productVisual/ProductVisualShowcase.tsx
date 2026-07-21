"use client";
// FILE: components/home/productVisual/ProductVisualShowcase.tsx
// Tabbed premium product shots — minimal text, maximum visual clarity.

import { useState } from "react";
import { motion } from "framer-motion";
import { PassportFlowVisual } from "./PassportFlowVisual";
import { RwaUnlockVisual } from "./RwaUnlockVisual";
import { DashboardVisual } from "./DashboardVisual";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import { PRODUCT_DEMO_FLOWS, type ProductDemoFlowId } from "@/lib/productVisualDemo";

const FLOW_COMPONENTS: Record<ProductDemoFlowId, React.ComponentType> = {
  passport: PassportFlowVisual,
  unlock: RwaUnlockVisual,
  dashboard: DashboardVisual,
};

export function ProductVisualShowcase() {
  const [active, setActive] = useState<ProductDemoFlowId>("passport");
  const flow = PRODUCT_DEMO_FLOWS.find(f => f.id === active)!;
  const Visual = FLOW_COMPONENTS[active];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: "clamp(0.85rem, 2vw, 1.1rem)",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {PRODUCT_DEMO_FLOWS.map(f => {
          const on = f.id === active;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActive(f.id)}
              style={{
                fontFamily: DEMO_TYPOGRAPHY.fontSans,
                fontSize: "0.78rem",
                fontWeight: 800,
                padding: "10px 18px",
                borderRadius: 999,
                border: `1px solid ${on ? f.accent : COSMIC_PALETTE.glassBorder}`,
                background: on ? `${f.accent}18` : "rgba(0,0,0,0.25)",
                color: on ? f.accent : COSMIC_PALETTE.textSecondary,
                cursor: "pointer",
                boxShadow: on ? `0 0 24px ${f.accent}22` : undefined,
                transition: "all 0.25s ease",
              }}
            >
              {f.tab}
            </button>
          );
        })}
      </div>

      <motion.p
        key={flow.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          fontFamily: DEMO_TYPOGRAPHY.fontMono,
          fontSize: "0.58rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: flow.accent,
          textAlign: "center",
          margin: "0 0 0.75rem",
        }}
      >
        {flow.tagline}
      </motion.p>

      <motion.div
        key={active}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Visual />
      </motion.div>
    </div>
  );
}
