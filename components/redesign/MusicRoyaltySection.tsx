"use client";
// FILE: components/redesign/MusicRoyaltySection.tsx
// Premium dark music & IP royalty vertical for the redesign homepage.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArtistAuditForm } from "@/components/music/ArtistAuditForm";
import { discoverImages } from "@/lib/discoverImages";
import { Btn } from "./ui";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const VIOLET = "#8B5CF6";
const AMBER = "#F59E0B";

const ISSUES = [
  { label: "Missing ISRCs", color: AMBER,
    desc: "Tracks without a unique ID never match to royalty payouts." },
  { label: "Split errors", color: VIOLET,
    desc: "Publishing splits filed wrong route songwriter income elsewhere." },
  { label: "MLC gaps", color: ACCENT,
    desc: "Mechanical royalties sit unclaimed when catalogs are not matched." },
];

const CATALOG = [
  {
    tag: "First artist on Abraxas",
    tagColor: ACCENT,
    name: "D-9 Musick",
    role: "Atlanta producer · active since 2008",
    blurb: "First catalog through the Abraxas royalty audit pipeline.",
    href: "https://music.apple.com/us/artist/d-9-musick/1449871408",
    cta: "Apple Music",
    visual: "d9" as const,
  },
  {
    tag: "Literary IP verified",
    tagColor: VIOLET,
    name: "DeMarko Reddins",
    role: "Published author · full catalog",
    blurb: "Ebook and print bundle options through Abraxas.",
    href: "/terminal#assets",
    cta: "View catalog",
    visual: "demarko" as const,
  },
  {
    tag: "Entertainment IP",
    tagColor: AMBER,
    name: "Chancellor K. Jackson",
    role: "TV pilot · anime treatment",
    blurb: "\"14 Days in Beijing\". script and rights access on Abraxas.",
    href: "/terminal#assets",
    cta: "View project",
    visual: "chancellor" as const,
  },
];

function CatalogThumb({ kind }: { kind: "d9" | "demarko" | "chancellor" }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (kind === "d9") return;
    const folder = kind === "demarko" ? "demarko" : "chancellor";
    const count = kind === "demarko" ? 8 : 3;
    const pad = kind === "demarko" ? 3 : 4;
    const candidates = Array.from({ length: count }, (_, i) =>
      `/assets/${folder}/${String(i + 1).padStart(pad, "0")}.jpg`);
    discoverImages(`${kind}-redesign`, candidates).then(found => {
      if (found.length > 0) setSrc(found[0]);
    });
  }, [kind]);

  if (kind === "d9") {
    return (
      <div style={{
        width: 72, height: 72, borderRadius: 12, overflow: "hidden", flexShrink: 0,
        background: "var(--surface)", border: "1px solid var(--border)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/worldwearables/1616.jpg" alt="D-9 Musick"
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  return (
    <div style={{
      width: 72, height: 72, borderRadius: 12, overflow: "hidden", flexShrink: 0,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      {src && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
    </div>
  );
}

export function MusicRoyaltySection({ hideHeader = false }: { hideHeader?: boolean }) {
  const [tracks, setTracks] = useState(50);
  const [years, setYears] = useState(3);

  const low = tracks * years * 12;
  const high = tracks * years * 65;
  function fmt(n: number) {
    return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
  }

  return (
    <section id="music-audit">
      <motion.div variants={staggerContainer(0.08, 0.05)} initial="hidden"
        whileInView="show" viewport={{ once: true, margin: "-60px" }}>
        {/* Header */}
        {!hideHeader && (
        <motion.div variants={staggerItem} style={{ marginBottom: "2rem" }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700,
            color: ACCENT, letterSpacing: "0.14em", textTransform: "uppercase",
            marginBottom: "0.5rem",
          }}>
            Music & IP royalties
          </div>
          <h2 style={{
            fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.05,
            color: "var(--text-primary)", margin: "0 0 0.75rem", maxWidth: 640,
          }}>
            Royalties you earned but never collected.
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
            lineHeight: 1.75, maxWidth: 560, margin: 0,
          }}>
            Publishing deals routinely route income to the wrong party. Our audit finds
            ISRC gaps, unregistered compositions, and MLC mismatches. No cost to find out.
            Fee is 20% only on what we actually recover.
          </p>
        </motion.div>
        )}

        {/* Issue chips */}
        <motion.div variants={staggerItem}
          style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.75rem" }}>
          {ISSUES.map(issue => (
            <div key={issue.label} style={{
              padding: "0.55rem 0.95rem", borderRadius: 999,
              background: `${issue.color}10`, border: `1px solid ${issue.color}35`,
              fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
            }}>
              <span style={{ fontWeight: 700, color: issue.color }}>{issue.label}</span>
              <span style={{ color: "var(--text-muted)" }}> · {issue.desc}</span>
            </div>
          ))}
        </motion.div>

        {/* Main grid: estimator + form | catalog */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "1.25rem",
          alignItems: "start",
        }}>
          <motion.div variants={staggerItem}>
            {/* Estimator card */}
            <div style={{
              padding: "1.35rem",
              borderRadius: 18,
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
              marginBottom: "1.25rem",
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
                color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase",
                marginBottom: "1rem",
              }}>
                Estimate your unclaimed range
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
                                  display: "block", marginBottom: "0.35rem" }}>
                    Tracks released · {tracks}
                  </label>
                  <input type="range" min={5} max={300} value={tracks}
                    onChange={e => setTracks(Number(e.target.value))}
                    style={{ width: "100%", accentColor: ACCENT }} />
                </div>
                <div>
                  <label style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
                                  display: "block", marginBottom: "0.35rem" }}>
                    Years active · {years}
                  </label>
                  <input type="range" min={1} max={20} value={years}
                    onChange={e => setYears(Number(e.target.value))}
                    style={{ width: "100%", accentColor: ACCENT }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.75rem",
                  fontWeight: 700, color: ACCENT, letterSpacing: "-0.02em",
                }}>
                  {fmt(low)}, {fmt(high)}
                </span>
                <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  estimated range
                </span>
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
                lineHeight: 1.6, margin: "0.75rem 0 0",
              }}>
                Heuristic based on catalog size. Not a guarantee. You keep 80% of anything recovered.
              </p>
            </div>

            <ArtistAuditForm theme="dark" />
          </motion.div>

          {/* Catalog showcase */}
          <motion.div variants={staggerItem} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{
              fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
              color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase",
              marginBottom: "0.25rem",
            }}>
              Verified catalogs on Abraxas
            </div>
            {CATALOG.map(item => (
              <motion.div key={item.name}
                whileHover={{ y: -3, borderColor: `${item.tagColor}50` }}
                style={{
                  padding: "1.1rem 1.15rem",
                  borderRadius: 16,
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  transition: "border-color 0.2s",
                }}>
                <CatalogThumb kind={item.visual} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
                    color: item.tagColor, letterSpacing: "0.06em",
                    textTransform: "uppercase", marginBottom: "0.25rem",
                  }}>
                    {item.tag}
                  </div>
                  <div style={{
                    fontFamily: FONT, fontSize: "1rem", fontWeight: 700,
                    color: "var(--text-primary)", marginBottom: 2,
                  }}>
                    {item.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {item.role}
                  </div>
                  <p style={{
                    fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
                    lineHeight: 1.55, margin: "0.5rem 0 0.65rem",
                  }}>
                    {item.blurb}
                  </p>
                  <Link href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    style={{
                      fontFamily: FONT, fontSize: "0.76rem", fontWeight: 600,
                      color: item.tagColor, textDecoration: "none",
                    }}>
                    {item.cta} →
                  </Link>
                </div>
              </motion.div>
            ))}

            <div style={{
              padding: "1.15rem",
              borderRadius: 16,
              border: `1px dashed ${ACCENT}40`,
              background: `${ACCENT}08`,
              textAlign: "center",
            }}>
              <p style={{
                fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
                lineHeight: 1.6, margin: "0 0 0.75rem",
              }}>
                Own music, publishing, or entertainment IP? Start with a free catalog scan.
              </p>
              <Btn href="#music-audit" variant="secondary" size="sm">
                Submit your catalog
              </Btn>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
