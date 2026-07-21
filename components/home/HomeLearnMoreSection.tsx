"use client";
// FILE: components/home/HomeLearnMoreSection.tsx
// Collapsed deep content — deck, article, market pulse below the cold path.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HomeInstitutionalShowcase } from "@/components/home/HomeInstitutionalShowcase";
import { HomeFeaturedArticle } from "@/components/home/HomeFeaturedArticle";
import { HomeMarketTicker } from "@/components/home/HomeMarketTicker";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeLearnMoreSection() {
  const [open, setOpen] = useState(false);

  return (
    <section id="learn-more" aria-labelledby="learn-more-heading" style={{ marginTop: "clamp(1rem, 3vw, 1.5rem)" }}>
      <div style={{ textAlign: "center", marginBottom: open ? "clamp(1.5rem, 4vw, 2rem)" : 0 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: 999,
            border: "1px solid var(--border-strong)",
            background: open ? "rgba(16,185,129,0.1)" : "var(--surface-raised)",
            fontFamily: FONT,
            fontSize: "0.82rem",
            fontWeight: 700,
            color: open ? "var(--accent)" : "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          {open ? "Hide deep dive ↑" : "Learn more — deck, article, market pulse →"}
        </button>
        {!open && (
          <p
            id="learn-more-heading"
            style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              margin: "0.65rem 0 0",
              lineHeight: 1.5,
            }}
          >
            Product deck · RWA thesis article · live market desk
          </p>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            style={{ overflow: "hidden" }}
          >
            <HomeInstitutionalShowcase />
            <HomeFeaturedArticle />
            <HomeMarketTicker />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
