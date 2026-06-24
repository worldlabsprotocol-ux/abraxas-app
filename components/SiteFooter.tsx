"use client";
// FILE: components/SiteFooter.tsx
// The real footer, didn't exist anywhere on the live site before this,
// the GitHub link from much earlier lived on the old splash page,
// which now just redirects and never renders. Social, legal, and
// learn-style links all live here, one place.

const S = "'Inter',system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const BDR = "#E5E5E0";

const LINKS = {
  product: [
    { label: "Marketplace", href: "/terminal" },
    { label: "Dashboard",   href: "/dashboard" },
    { label: "Passport",    href: "/passport" },
    { label: "Build on Abraxas", href: "/build" },
  ],
  legal: [
    { label: "Privacy Policy",    href: "/legal/privacy" },
    { label: "Terms of Service",  href: "/legal/terms" },
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
      <div style={{ fontFamily:M, fontSize:"0.62rem", fontWeight:700,
                     color:"rgba(21,21,26,0.3)", letterSpacing:"0.1em",
                     textTransform:"uppercase", marginBottom:"0.75rem" }}>
        {title}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
        {items.map(item => (
          <a key={item.label} href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{ fontFamily:S, fontSize:"0.78rem",
                      color:"rgba(21,21,26,0.55)", textDecoration:"none" }}>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ borderTop:`1px solid ${BDR}`, marginTop:"2rem",
                      padding:"2rem clamp(0.875rem,3vw,1.5rem) 1.5rem" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
                       gap:"1.5rem", marginBottom:"2rem" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                           marginBottom:"0.75rem" }}>
              <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
                <polygon points="20,2 38,20 20,38 2,20" stroke={G} strokeWidth="2" fill="none"/>
                <polygon points="20,8 32,20 20,32 8,20" stroke={G} strokeWidth="1.5" fill={`${G}1A`}/>
                <circle cx="20" cy="20" r="3" fill={G}/>
              </svg>
              <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:900,
                              letterSpacing:"0.04em", color:G }}>
                ABRAXAS
              </span>
            </div>
            <p style={{ fontFamily:S, fontSize:"0.74rem",
                         color:"rgba(21,21,26,0.4)", lineHeight:1.6, maxWidth:200 }}>
              The verification layer for real-world assets on Solana.
            </p>
          </div>
          <Column title="Product" items={LINKS.product} />
          <Column title="Social" items={LINKS.social} />
          <Column title="Legal" items={LINKS.legal} />
        </div>
        <div style={{ paddingTop:"1.25rem", borderTop:`1px solid ${BDR}`,
                       fontFamily:S, fontSize:"0.68rem",
                       color:"rgba(21,21,26,0.3)" }}>
          © {new Date().getFullYear()} Abraxas Protocol, World Labs Protocol.
        </div>
      </div>
    </footer>
  );
}
