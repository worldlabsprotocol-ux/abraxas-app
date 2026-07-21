"use client";
// FILE: components/home/HomeProductVisualSection.tsx
// Premium Figma-style product shots for demo recording.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { ProductVisualShowcase } from "@/components/home/productVisual/ProductVisualShowcase";
import { DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";

const FONT = DEMO_TYPOGRAPHY.fontSans;

export function HomeProductVisualSection() {
  return (
    <section
      id="product-demo"
      aria-labelledby="product-demo-heading"
      className="abx-cosmic-card"
      style={{
        padding: "clamp(1.25rem, 3vw, 1.75rem)",
        margin: "0 0 clamp(1rem, 2vw, 1.5rem)",
        borderRadius: 20,
        borderBottom: "none",
      }}
    >
      <EliteSectionLead
        eyebrow="Product"
        title={<span id="product-demo-heading">See it. Don&apos;t read it.</span>}
        headingId="product-demo-heading"
        center
      />

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
