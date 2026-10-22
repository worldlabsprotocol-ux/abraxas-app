import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Visual draft (internal)",
  robots: { index: false, follow: false },
};

const draft = {
  sphereConcept: "/brand/draft/abraxas-living-sphere-concept.jpg",
  operatorConcept: "/brand/draft/abraxas-protocol-operator-concept.jpg",
  lockup: "/brand/draft/abraxas-sphere-wordmark-lockup.jpg",
  refSphere: "/brand/draft/references/founder-sphere-reference.png",
  refRobot: "/brand/draft/references/founder-robot-reference.png",
  official: "/brand/draft/references/current-official-emblem.png",
} as const;

export default function InternalVisualDraftPage() {
  return (
    <main
      style={{
        background: "#070b10",
        color: "#e8eef2",
        minHeight: "100vh",
        padding: "1.5rem clamp(1rem, 3vw, 2.5rem) 3rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
        Internal only — not linked from product nav. Production branding unchanged.
      </p>
      <h1 style={{ fontSize: "1.35rem", fontWeight: 600, margin: "0 0 1.25rem" }}>Abraxas visual draft</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", color: "#4cbb92", marginBottom: "0.75rem" }}>Reference → Abraxas sphere concept</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <figure>
            <Image src={draft.refSphere} alt="Founder reference — organic sphere (internal)" width={512} height={512} style={{ width: "100%", height: "auto", borderRadius: 8 }} />
            <figcaption style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 6 }}>Reference (not Abraxas IP)</figcaption>
          </figure>
          <figure>
            <Image src={draft.sphereConcept} alt="Original Abraxas living sphere concept" width={1024} height={1024} priority style={{ width: "100%", height: "auto", borderRadius: 8 }} />
            <figcaption style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 6 }}>Generated original concept — draft</figcaption>
          </figure>
        </div>
        <figure style={{ marginTop: "1.25rem", maxWidth: 960 }}>
          <Image src={draft.lockup} alt="Abraxas sphere with wordmark exploration" width={1600} height={900} style={{ width: "100%", height: "auto", borderRadius: 8 }} />
        </figure>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", color: "#4cbb92", marginBottom: "0.75rem" }}>Reference → Abraxas operator concept</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          <figure>
            <Image src={draft.refRobot} alt="Founder reference — mechanical robot (internal)" width={512} height={512} style={{ width: "100%", height: "auto", borderRadius: 8 }} />
            <figcaption style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 6 }}>Reference (third-party — rights not assumed)</figcaption>
          </figure>
          <figure>
            <Image src={draft.operatorConcept} alt="Original Abraxas Protocol Operator concept" width={1024} height={1024} style={{ width: "100%", height: "auto", borderRadius: 8 }} />
            <figcaption style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 6 }}>Generated original character — draft</figcaption>
          </figure>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1rem", color: "#4cbb92", marginBottom: "0.75rem" }}>Current official emblem (continuity)</h2>
        <Image src={draft.official} alt="Current production Abraxas emblem" width={256} height={256} style={{ height: 128, width: "auto" }} />
        <p style={{ fontSize: "0.8rem", color: "#64748b", maxWidth: 520, marginTop: 8 }}>
          Favicon / simplified mark derived only after full artwork sign-off. Engineering notes:{" "}
          <code style={{ color: "#94a3b8" }}>docs/internal/asm-technical-assessment.md</code>
        </p>
      </section>
    </main>
  );
}
