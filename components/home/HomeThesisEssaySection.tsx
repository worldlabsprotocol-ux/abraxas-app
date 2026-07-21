"use client";
// FILE: components/home/HomeThesisEssaySection.tsx
// RWA tokenization thesis — Medium essay as homepage cinematic demo.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ConceptDemoLead, ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { RwaThesisCinematicDemo } from "@/components/home/cinematic/RwaThesisCinematicDemo";
import {
  RWA_THESIS_ABRAXAS_CLOSE,
  RWA_THESIS_HOME_LEAD,
  RWA_THESIS_MEDIUM_URL,
  RWA_THESIS_SLUG,
  RWA_THESIS_SUBTITLE,
  RWA_THESIS_TITLE,
  RWA_INSTITUTION_QUESTIONS,
} from "@/lib/rwaTokenizationThesis";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeThesisEssaySection() {
  return (
    <section
      id="thesis"
      aria-labelledby="thesis-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <ConceptDemoLead
        eyebrow="Vision & thesis · Published on Medium · July 2026"
        title={
          <>
            <span id="thesis-heading">{RWA_THESIS_TITLE}</span>
          </>
        }
        body={RWA_THESIS_HOME_LEAD}
        headingId="thesis-heading"
      />

      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.88rem, 2vw, 1rem)",
          fontWeight: 800,
          color: "var(--accent-pale, var(--accent))",
          margin: "0 0 0.85rem",
          lineHeight: 1.4,
          maxWidth: 640,
        }}
      >
        {RWA_THESIS_SUBTITLE}
      </p>

      <ConceptDemoVideo demo={RwaThesisCinematicDemo} id="thesis-demo" />

      <div
        style={{
          padding: "clamp(1rem, 2.5vw, 1.25rem)",
          borderRadius: 16,
          border: "1px solid rgba(232,197,71,0.35)",
          background: "linear-gradient(155deg, rgba(232,197,71,0.08) 0%, var(--surface-raised) 100%)",
        }}
      >
        <p
          style={{
            fontFamily: MONO,
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--accent)",
            margin: "0 0 0.5rem",
          }}
        >
          Tokenization alone isn&apos;t enough
        </p>
        <ul
          style={{
            margin: "0 0 0.85rem",
            paddingLeft: "1.1rem",
            fontFamily: FONT,
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
          }}
        >
          {RWA_INSTITUTION_QUESTIONS.map(q => (
            <li key={q} style={{ marginBottom: "0.25rem" }}>
              {q}
            </li>
          ))}
        </ul>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 1rem",
            maxWidth: 680,
          }}
        >
          {RWA_THESIS_ABRAXAS_CLOSE}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <Btn href={`/blog/${RWA_THESIS_SLUG}`} size="lg">
            Read full essay on Abraxas →
          </Btn>
          <Btn href={RWA_THESIS_MEDIUM_URL} variant="secondary" size="lg">
            Original on Medium →
          </Btn>
          <Link
            href="/integrate"
            style={{
              fontFamily: FONT,
              fontSize: "0.76rem",
              fontWeight: 700,
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            Integrate the verify layer →
          </Link>
        </div>
      </div>
    </section>
  );
}
