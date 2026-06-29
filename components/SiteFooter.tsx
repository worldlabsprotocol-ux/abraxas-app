"use client";
// FILE: components/SiteFooter.tsx
// Persistent footer on all protocol pages. Theme-aware.

const S = "'Inter',system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";

const LINKS = {
  product: [
    { label: "Marketplace", href: "/terminal" },
    { label: "Passport",    href: "/passport" },
    { label: "Dashboard",   href: "/dashboard" },
    { label: "Build",       href: "/build" },
    { label: "Swap",        href: "/swap" },
  ],
  learn: [
    { label: "Documentation", href: "/docs" },
    { label: "Roadmap",       href: "/roadmap" },
    { label: "Tokenomics",    href: "/tokenomics" },
    { label: "FAQ",           href: "/faq" },
    { label: "Security",      href: "/security" },
    { label: "Partners",      href: "/partners" },
    { label: "About",         href: "/about" },
  ],
  legal: [
    { label: "Legal overview",  href: "/legal" },
    { label: "Privacy Policy",  href: "/legal/privacy" },
    { label: "Terms of Service", href: "/legal/terms" },
  ],
  social: [
    { label: "Discord",  href: "https://discord.gg/sHK8EWbnXH" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/worldlabsprotocol/" },
    { label: "GitHub",   href: "https://github.com/worldlabsprotocol-ux/abraxas-app" },
  ],
};

function Column({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div style={{
        fontFamily: M,
        fontSize: "0.62rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: "0.75rem",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {items.map(item => (
          <a key={item.label} href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{
              fontFamily: S,
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      marginTop: "2rem",
      padding: "2rem clamp(0.875rem, 3vw, 1.5rem) 1.5rem",
      position: "relative",
      zIndex: 1,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}>
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}>
              <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
                <polygon points="20,2 38,20 20,38 2,20" stroke={G} strokeWidth="2" fill="none"/>
                <polygon points="20,8 32,20 20,32 8,20" stroke={G} strokeWidth="1.5" fill={`${G}1A`}/>
                <circle cx="20" cy="20" r="3" fill={G}/>
              </svg>
              <span style={{
                fontFamily: S,
                fontSize: "0.85rem",
                fontWeight: 900,
                letterSpacing: "0.04em",
                color: G,
              }}>
                ABRAXAS
              </span>
            </div>
            <p style={{
              fontFamily: S,
              fontSize: "0.74rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              maxWidth: 220,
            }}>
              Verify once. Transact everywhere. The verification layer for real-world assets on Solana.
            </p>
            <p style={{
              fontFamily: S,
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              marginTop: "0.75rem",
            }}>
              Live at{" "}
              <a href="https://abraxas-app.vercel.app/" style={{ color: G, textDecoration: "none" }}>
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
          fontFamily: S,
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
