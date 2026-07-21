"use client";
// FILE: components/home/HomeProductVisualSection.tsx
// Premium Figma-style product shots for demo recording.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ProductVisualShowcase } from "@/components/home/productVisual/ProductVisualShowcase";
import { DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";

const FONT = DEMO_TYPOGRAPHY.fontSans;

export function HomeProductVisualSection() {
  return (
    <section
      id="product-demo"
      aria-labelledby="product-demo-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "clamp(0.85rem, 2vw, 1.25rem)" }}>
        <p
          style={{
            fontFamily: DEMO_TYPOGRAPHY.fontMono,
            fontSize: "0.58rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--accent)",
            margin: "0 0 0.4rem",
          }}
        >
          Product · visual flow
        </p>
        <h2
          id="product-demo-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.1rem, 2.8vw, 1.45rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: "0 0 0.35rem",
          }}
        >
          See it. Don&apos;t read it.
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            color: "var(--text-muted)",
            margin: 0,
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.5,
          }}
        >
          Passport · verify · unlock — three flows, zero paragraphs.
        </p>
      </div>

      <ProductVisualShowcase />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          justifyContent: "center",
          marginTop: "1.1rem",
        }}
      >
        <Btn href="/passport" size="sm">
          Open Passport →
        </Btn>
        <Btn href="/verify" variant="secondary" size="sm">
          Verify records →
        </Btn>
        <Link
          href="/demo/product"
          style={{
            fontFamily: FONT,
            fontSize: "0.74rem",
            fontWeight: 700,
            color: "var(--accent)",
            alignSelf: "center",
            textDecoration: "none",
          }}
        >
          Full-screen demo →
        </Link>
      </div>
    </section>
  );
}
