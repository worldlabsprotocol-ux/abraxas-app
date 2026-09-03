"use client";
// FILE: components/redesign/RedesignFooter.tsx
// Structured footer — product, developers, company.

import Link from "next/link";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_DEVELOPER_LINKS,
  FOOTER_PRODUCT_LINKS,
} from "@/lib/design/footerLinks";
import { PUBLIC_FONT_SANS } from "@/lib/design/publicSurface";

const FONT = PUBLIC_FONT_SANS;

const FOOTER_TAGLINE =
  "Reusable private verification for people and participating services.";

function FooterColumn({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div style={{ minWidth: 140, flex: "1 1 140px" }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.55rem",
      }}>
        {title}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.4rem" }}>
        {links.map((item) => (
          <li key={item.href + item.label}>
            <Link href={item.href} style={{
              fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", textDecoration: "none",
            }}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RedesignFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      position: "relative",
      zIndex: 1,
      marginTop: "var(--section-gap, 3rem)",
    }}>
      <div style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "2rem clamp(1rem, 3vw, 2rem) 2.5rem",
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 900, color: "var(--accent)", marginBottom: "0.35rem" }}>
            ABRAXAS
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0, maxWidth: 420 }}>
            {FOOTER_TAGLINE}
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem 2rem", marginBottom: "1.5rem" }}>
          <FooterColumn title="Product" links={FOOTER_PRODUCT_LINKS} />
          <FooterColumn title="Developers" links={FOOTER_DEVELOPER_LINKS} />
          <FooterColumn title="Company" links={FOOTER_COMPANY_LINKS} />
        </div>

        <div style={{
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
          fontFamily: FONT,
          fontSize: "0.68rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}>
          © {new Date().getFullYear()} Abraxas · Not investment advice.
        </div>
      </div>
    </footer>
  );
}
