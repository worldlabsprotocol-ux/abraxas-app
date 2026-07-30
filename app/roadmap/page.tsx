"use client";
// FILE: app/roadmap/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import {
  ROADMAP_HEADLINE,
  ROADMAP_LONG_TERM_VISION,
  ROADMAP_NARRATIVE,
  ROADMAP_SECTIONS,
  ROADMAP_SUBTITLE,
} from "@/lib/roadmapPublic";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function RoadmapPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader eyebrow="Roadmap" title={ROADMAP_HEADLINE} subtitle={ROADMAP_SUBTITLE} />

      <ContentCard title="How we got here">
        <div style={{ display: "grid", gap: "0.55rem" }}>
          {ROADMAP_NARRATIVE.map(line => (
            <p
              key={line}
              style={{
                fontFamily: FONT,
                fontSize: "0.84rem",
                color: "var(--text-secondary)",
                margin: 0,
                lineHeight: 1.65,
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </ContentCard>

      {ROADMAP_SECTIONS.map(section => (
        <ContentCard key={section.id} title={`${section.emoji} ${section.phase}`}>
          <p
            style={{
              fontFamily: FONT,
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              margin: "0 0 0.85rem",
              lineHeight: 1.6,
            }}
          >
            {section.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {section.items.map(item => (
              <span
                key={item}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 999,
                  background: `${section.color}12`,
                  border: `1px solid ${section.color}30`,
                  fontFamily: FONT,
                  fontSize: "0.76rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.45,
                }}
              >
                {section.id === "completed" ? "✓ " : ""}
                {item}
              </span>
            ))}
          </div>
        </ContentCard>
      ))}

      <ContentCard title={ROADMAP_LONG_TERM_VISION.title}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            margin: "0 0 0.85rem",
            lineHeight: 1.6,
          }}
        >
          {ROADMAP_LONG_TERM_VISION.body}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {ROADMAP_LONG_TERM_VISION.items.map(item => (
            <span
              key={item}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: 999,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontFamily: FONT,
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                lineHeight: 1.45,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
