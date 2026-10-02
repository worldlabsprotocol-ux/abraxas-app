"use client";
// FILE: components/home/cinematic/thesis/DeveloperStorySection.tsx
// Developer entry after thesis — routes to Integration Studio.

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_DISPLAY, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import {
  CINEMATIC_CTA_SECONDARY_HREF,
  DEVELOPER_STORY_BODY,
  DEVELOPER_STORY_HEADLINE,
} from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;
const DISPLAY = ABX_FONT_DISPLAY;

export function DeveloperStorySection() {
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="developer-story-heading" className="abx-cinematic-developer abx-home-section-center">
      <motion.h2
        id="developer-story-heading"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(1rem, 2.8vw, 1.45rem)",
          fontWeight: 900,
          letterSpacing: "0.06em",
          margin: "0 0 0.85rem",
          color: "var(--text-primary)",
        }}
      >
        {DEVELOPER_STORY_HEADLINE}
      </motion.h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.88rem",
          color: "var(--text-secondary)",
          margin: "0 0 1rem",
          maxWidth: 480,
          lineHeight: 1.55,
        }}
      >
        {DEVELOPER_STORY_BODY}
      </p>
      <Link
        href={CINEMATIC_CTA_SECONDARY_HREF}
        style={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "#2DD4BF",
          textDecoration: "none",
        }}
      >
        Open Integration Studio →
      </Link>
    </section>
  );
}
