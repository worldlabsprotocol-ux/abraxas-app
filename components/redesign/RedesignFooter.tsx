"use client";
// FILE: components/redesign/RedesignFooter.tsx
// Slim footer — matches current product scale.

import Link from "next/link";
import { SITE_URL } from "@/lib/siteUrl";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const PRODUCT = [
  { label: "Home", href: "/" },
  { label: "Operators", href: "/operators" },
  { label: "Learn hub", href: "/blog" },
  { label: "Passport", href: "/passport" },
  { label: "Verify", href: "/verify" },
  { label: "Cielo pilot", href: "/cielo/verified-rate" },
  { label: "Registry", href: "/#registry" },
];

const PARTNERS = [
  { label: "Design partner", href: "/design-partner" },
  { label: "Integrations", href: "/integrations" },
  { label: "List your asset", href: "/build" },
  { label: "Documentation", href: "/docs" },
];

const LEARN = [
  { label: "Learn hub", href: "/blog" },
  { label: "From the builder", href: "/blog/founder" },
  { label: "Our focus", href: "/north-star" },
  { label: "Cielo case study", href: "/case-studies/cielo" },
  { label: "Community", href: "/community" },
  { label: "About", href: "/about" },
];

const LEGAL = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Legal overview", href: "/legal" },
];

function Column({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        color: "var(--text-muted)", letterSpacing: "0.1em",
        textTransform: "uppercase", marginBottom: "0.75rem",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {items.map(item => (
          <Link key={item.label} href={item.href} style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", textDecoration: "none",
          }}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function RedesignFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      position: "relative", zIndex: 1,
      marginTop: "var(--section-gap, 3rem)",
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "2rem clamp(1rem, 3vw, 2rem) 2.5rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1.5rem", marginBottom: "2rem",
        }}>
          <div style={{ minWidth: 180 }}>
            <div className="abx-gradient-text" style={{
              fontFamily: FONT, fontSize: "0.85rem", fontWeight: 900, marginBottom: "0.5rem",
            }}>
              ABRAXAS
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)",
              lineHeight: 1.6, maxWidth: 240, margin: 0,
            }}>
              Reusable trust for people and assets — not another document upload.
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
              <a href={SITE_URL} style={{ color: "var(--accent)", textDecoration: "none" }}>abraxas-app.vercel.app</a>
            </p>
          </div>
          <Column title="Product" items={PRODUCT} />
          <Column title="Partners" items={PARTNERS} />
          <Column title="Learn" items={LEARN} />
          <Column title="Legal" items={LEGAL} />
        </div>
        <div style={{
          paddingTop: "1.25rem", borderTop: "1px solid var(--border)",
          fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.6,
        }}>
          © {new Date().getFullYear()} Abraxas Protocol, World Labs Protocol. Not investment advice.
        </div>
      </div>
    </footer>
  );
}
