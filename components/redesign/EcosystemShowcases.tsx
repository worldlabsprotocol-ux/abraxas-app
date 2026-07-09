"use client";
// FILE: components/redesign/EcosystemShowcases.tsx
// Vertical proofs — same trust engine, different industries.

import Link from "next/link";
import { motion } from "framer-motion";
import { CIELO_PORCH_IMAGE } from "@/lib/data/cieloMedia";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import type { CapabilityStatus } from "@/lib/capabilityStatus";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const SHOWCASES: ReadonlyArray<{
  title: string;
  vertical: string;
  desc: string;
  href: string;
  status: CapabilityStatus;
  accent: string;
  image?: string;
  objectPosition?: string;
}> = [
  {
    title: "Genesis hospitality pilot",
    vertical: "Hospitality proof",
    desc: "End-to-end verified stay — zkLogin, credential check, USDC on Sui.",
    href: "/flagship",
    status: "pilot",
    accent: ACCENT,
    image: CIELO_PORCH_IMAGE.src,
    objectPosition: "center 35%",
  },
  {
    title: "Music royalty audit",
    vertical: "Media-rights proof",
    desc: "Split-sheet gaps, distribution leakage, and catalog provenance for media owners.",
    href: "/apps/music",
    status: "live",
    accent: "#8B5CF6",
  },
  {
    title: "Wyoming LLC engine",
    vertical: "Entity-formation proof",
    desc: "Entity formation bound to verified ownership and the asset pipeline.",
    href: "/apps/wyoming",
    status: "pilot",
    accent: "#3B82F6",
  },
];

export function EcosystemShowcases() {
  return (
    <section style={{ paddingTop: "0.75rem" }}>
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Vertical proofs
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.08,
          color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 560,
        }}>
          Same trust engine — different industries
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 580, margin: 0,
        }}>
          Cielo proves hospitality. Music audit proves media rights. Wyoming LLC proves entity formation.
          Each is a live or pilot application of Passport + Registry + partner APIs — not a separate product line.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "0.85rem",
      }}>
        {SHOWCASES.map((s, i) => (
          <motion.div
            key={s.href}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href={s.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
              <div style={{
                borderRadius: 14, overflow: "hidden", height: "100%",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
              }}>
                {s.image ? (
                  <div style={{ position: "relative", height: 96, background: "#06090B" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.image}
                      alt=""
                      style={{
                        width: "100%", height: "100%", objectFit: "cover", display: "block",
                        objectPosition: s.objectPosition ?? "center",
                      }}
                    />
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to top, rgba(6,9,11,0.75) 0%, transparent 55%)",
                    }} />
                    <span style={{
                      position: "absolute", top: 10, left: 10,
                      fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                      padding: "0.2rem 0.45rem", borderRadius: 999,
                      background: "rgba(0,0,0,0.55)", color: s.accent,
                      border: `1px solid ${s.accent}55`,
                    }}>
                      {s.vertical}
                    </span>
                    <span style={{ position: "absolute", top: 10, right: 10 }}>
                      <CapabilityStatusBadge status={s.status} size="xs" />
                    </span>
                  </div>
                ) : (
                  <div style={{
                    height: 4, background: s.accent,
                    borderRadius: "14px 14px 0 0",
                  }} />
                )}
                <div style={{ padding: "1.05rem 1.15rem" }}>
                  {!s.image && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                        padding: "0.2rem 0.45rem", borderRadius: 999,
                        color: s.accent, border: `1px solid ${s.accent}44`,
                        background: `${s.accent}12`, display: "inline-block",
                      }}>
                        {s.vertical}
                      </span>
                      <CapabilityStatusBadge status={s.status} size="xs" />
                    </div>
                  )}
                  <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    {s.title}
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
