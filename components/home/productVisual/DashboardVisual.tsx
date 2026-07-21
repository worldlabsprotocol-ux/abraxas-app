"use client";

import { motion } from "framer-motion";
import {
  BigLabel,
  MicroLabel,
  ProductVisualFrame,
} from "./ProductVisualPrimitives";
import { COSMIC_PALETTE, DEMO_MOTION, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import { DASHBOARD_ASSETS, DASHBOARD_HERO } from "@/lib/productVisualDemo";

const BAR_HEIGHTS = [42, 68, 55, 82, 74, 88, 76];

export function DashboardVisual() {
  const accent = COSMIC_PALETTE.gold;

  return (
    <ProductVisualFrame mesh="gold" accent={accent} aspect="wide">
      <MicroLabel accent={accent}>03 · Dashboard</MicroLabel>

      <div style={{ width: "100%", textAlign: "center", marginBottom: 12 }}>
        <MicroLabel>{DASHBOARD_HERO.label}</MicroLabel>
        <BigLabel accent={accent}>{DASHBOARD_HERO.total}</BigLabel>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 6,
            marginTop: 4,
            padding: "4px 12px",
            borderRadius: 999,
            background: `${COSMIC_PALETTE.emerald}18`,
            border: `1px solid ${COSMIC_PALETTE.emerald}44`,
          }}
        >
          <span style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "1.1rem", fontWeight: 900, color: COSMIC_PALETTE.emerald }}>
            {DASHBOARD_HERO.yield}
          </span>
          <span style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted }}>
            {DASHBOARD_HERO.yieldLabel}
          </span>
        </motion.div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 6,
          height: 72,
          width: "100%",
          marginBottom: 14,
        }}
      >
        {BAR_HEIGHTS.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: DEMO_MOTION.easeOut }}
            style={{
              flex: 1,
              maxWidth: 28,
              borderRadius: "6px 6px 2px 2px",
              background: `linear-gradient(180deg, ${accent}, ${COSMIC_PALETTE.violet}88)`,
              boxShadow: `0 0 12px ${accent}33`,
            }}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, width: "100%" }}>
        {DASHBOARD_ASSETS.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            style={{
              padding: "10px 8px",
              borderRadius: 12,
              border: `1px solid ${a.accent}44`,
              background: `${a.accent}0c`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.25rem", marginBottom: 4 }}>{a.icon}</div>
            <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontSans, fontSize: "0.62rem", fontWeight: 800, color: "#FAFAFA", lineHeight: 1.2 }}>
              {a.name.split(" ")[0]}
            </div>
            <div style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.52rem", color: a.accent, marginTop: 4, fontWeight: 700 }}>
              {a.value}
            </div>
          </motion.div>
        ))}
      </div>
    </ProductVisualFrame>
  );
}
