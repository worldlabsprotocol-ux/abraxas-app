"use client";
// FILE: components/redesign/RedesignFooter.tsx
// Protocol footer — curated columns, no link sprawl.

import Link from "next/link";
import { SITE_URL } from "@/lib/siteUrl";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const LINKS = {
  protocol: [
    { label: "Home", href: "/" },
    { label: "Passport", href: "/passport" },
    { label: "Verify", href: "/verify" },
    { label: "My account", href: "/account" },
    { label: "Submit your asset", href: "/build" },
    { label: "Browse registry", href: "/#registry" },
  ],
  apps: [
    { label: "Cielo pilot", href: "/apps/cielo-sunrise" },
    { label: "Music audit", href: "/apps/music" },
    { label: "Wyoming LLC", href: "/apps/wyoming" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  learn: [
    { label: "Why verification", href: "/docs/why-verification" },
    { label: "Cielo case study", href: "/case-studies/cielo" },
    { label: "FAQ", href: "/faq" },
    { label: "Roadmap", href: "/roadmap" },
    { label: "About", href: "/about" },
  ],
  developers: [
    { label: "Integrate", href: "/integrate" },
    { label: "Documentation", href: "/docs" },
    { label: "Integrations", href: "/integrations" },
    { label: "Relying parties", href: "/integrations/relying-parties" },
    { label: "Trust Framework", href: "/trust-framework" },
    { label: "Live metrics", href: "/metrics" },
    { label: "Security", href: "/security" },
  ],
  legal: [
    { label: "Legal overview", href: "/legal" },
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Terms of Service", href: "/legal/terms" },
    { label: "Settlement disclosure", href: "/legal#settlement" },
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
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}>
          <div style={{ gridColumn: "span 1", minWidth: 180 }}>
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
              Verify once. Transact everywhere. Real assets with proof you can reuse, not another KYC form.
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
              Live at{" "}
              <a href={SITE_URL} style={{ color: ACCENT, textDecoration: "none" }}>
                abraxas-app.vercel.app
              </a>
            </p>
          </div>
          <Column title="Protocol" items={LINKS.protocol} />
          <Column title="Apps" items={LINKS.apps} />
          <Column title="Learn" items={LINKS.learn} />
          <Column title="Developers" items={LINKS.developers} />
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
