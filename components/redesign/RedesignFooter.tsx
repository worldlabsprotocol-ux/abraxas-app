"use client";
// FILE: components/redesign/RedesignFooter.tsx
// Full protocol footer for the dark premium redesign.

import Link from "next/link";
import { SITE_URL } from "@/lib/siteUrl";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const LINKS = {
  product: [
    { label: "Assets", href: "/terminal" },
    { label: "Passport", href: "/passport" },
    { label: "Integrate", href: "/integrate" },
    { label: "Trust framework", href: "/trust-framework" },
    { label: "Platform", href: "/platform" },
    { label: "Solutions", href: "/solutions" },
    { label: "Developers", href: "/developers" },
  ],
  learn: [
    { label: "Learn hub", href: "/learn" },
    { label: "Trust infrastructure", href: "/learn/trust-infrastructure" },
    { label: "Comparisons", href: "/comparisons" },
    { label: "Research", href: "/research" },
    { label: "Tools", href: "/tools/verification-cost-calculator" },
    { label: "Documentation", href: "/docs" },
    { label: "Roadmap", href: "/roadmap" },
    { label: "Tokenomics", href: "/tokenomics" },
    { label: "FAQ", href: "/faq" },
    { label: "Security", href: "/security" },
    { label: "Partners", href: "/partners" },
    { label: "About", href: "/about" },
  ],
  legal: [
    { label: "Legal overview", href: "/legal" },
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Terms of Service", href: "/legal/terms" },
  ],
  social: [
    { label: "Discord", href: "https://discord.gg/sHK8EWbnXH" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/worldlabsprotocol/" },
    { label: "GitHub", href: "https://github.com/worldlabsprotocol-ux/abraxas-app" },
  ],
};

function Column({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div style={{
        fontFamily: MONO,
        fontSize: "0.58rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: "0.75rem",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {items.map(item => (
          <Link key={item.label} href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{
              fontFamily: FONT,
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
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
      position: "relative",
      zIndex: 1,
      marginTop: "var(--section-gap, 3rem)",
    }}>
      <div style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "2rem clamp(1rem, 3vw, 2rem) 2.5rem",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 900,
                           color: ACCENT, marginBottom: "0.5rem" }}>
              ABRAXAS
            </div>
            <p style={{
              fontFamily: FONT,
              fontSize: "0.74rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              maxWidth: 220,
            }}>
              Verify once. Transact everywhere. Trust infrastructure for tokenized assets.
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
              Live at{" "}
              <a href={SITE_URL} style={{ color: ACCENT, textDecoration: "none" }}>
                abraxas-app.vercel.app
              </a>
            </p>
          </div>
          <Column title="Product" items={LINKS.product} />
          <Column title="Learn" items={LINKS.learn} />
          <Column title="Legal" items={LINKS.legal} />
          <Column title="Community" items={LINKS.social} />
        </div>
        <div style={{
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--border)",
          fontFamily: FONT,
          fontSize: "0.68rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}>
          © {new Date().getFullYear()} Abraxas Protocol, World Labs Protocol. Not investment advice.
          RWA offerings may involve securities. Past performance does not guarantee future results.
        </div>
      </div>
    </footer>
  );
}
