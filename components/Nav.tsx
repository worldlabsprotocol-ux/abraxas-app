"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

const PRIMARY = [
  { href: "/marketplace", label: "Vaults"    },
  { href: "/app",         label: "Dashboard" },
];

const MENU_GROUPS = [
  {
    label: "Operate",
    links: [
      { href: "/marketplace", label: "Browse Vaults"  },
      { href: "/list",        label: "Register Asset" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/app",      label: "Dashboard"  },
      { href: "/operator", label: "My Profile" },
      { href: "/stake",    label: "Staking"    },
      { href: "/use",      label: "Use Capital"},
    ],
  },
  {
    label: "System",
    links: [
      { href: "/token",       label: "Token Details" },
      { href: "/why",         label: "Why Abraxas"   },
      { href: "/methodology", label: "Methodology"   },
      { href: "/legal",       label: "Legal"         },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: "56px", display: "flex", alignItems: "center",
        padding: "0 1rem", gap: "0.75rem",
        background: "rgba(2,3,10,0.96)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.45)", background: "radial-gradient(circle at 38% 38%, rgba(200,169,110,0.22), transparent 65%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px rgba(200,169,110,0.9)" }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.14em", color: "var(--gold)", textTransform: "uppercase" }}>Abraxas</span>
          </div>
        </Link>

        {/* Desktop links */}
        <div style={{ display: "none", alignItems: "center", gap: "1.5rem", flex: 1 }} className="md:flex">
          {PRIMARY.map((l) => (
            <Link key={l.href} href={l.href} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", color: pathname === l.href ? "var(--gold)" : "var(--muted)", position: "relative" }}>
              {pathname === l.href && <span style={{ position: "absolute", bottom: "-4px", left: 0, right: 0, height: "1px", background: "var(--gold)" }} />}
              {l.label}
            </Link>
          ))}
        </div>
        <div style={{ flex: 1 }} className="md:hidden" />

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
          <ConnectWalletButton size="sm" compact />
          <Link href="/onboard" style={{ textDecoration: "none", display: "none" }} className="md:flex">
            <div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "5px", padding: "0.3rem 0.65rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", whiteSpace: "nowrap" }}>
              Get Started
            </div>
          </Link>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu"
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", width: "28px", height: "28px", minWidth: "28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", flexShrink: 0, padding: 0 }}>
            {open
              ? <span style={{ fontSize: "0.72rem", color: "var(--gold)", lineHeight: 1 }}>✕</span>
              : <>
                  <span style={{ width: "14px", height: "1.5px", background: "var(--muted)", borderRadius: "1px", display: "block" }} />
                  <span style={{ width: "14px", height: "1.5px", background: "var(--muted)", borderRadius: "1px", display: "block" }} />
                </>
            }
          </button>
        </div>
      </nav>

      {/* Drawer */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 49, background: "rgba(2,3,10,0.98)", backdropFilter: "blur(24px)", paddingTop: "56px", overflowY: "auto" }}>
          <div style={{ padding: "1.25rem 1.25rem 6rem" }}>
            {MENU_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.56rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {group.label}
                </p>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem", fontWeight: pathname === link.href ? 700 : 400, textDecoration: "none", color: pathname === link.href ? "var(--gold)" : "var(--text)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {link.label}
                    {pathname === link.href && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--gold)" }} />}
                  </Link>
                ))}
              </div>
            ))}

            <div style={{ padding: "0.875rem 1rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>All Systems Operational</span>
              </div>
              <p style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>5 agents · 5 vaults · $0 unrecovered</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}