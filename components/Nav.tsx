"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { LanguageSelector } from "@/components/LanguageSelector";

const PRIMARY = [
  { href: "/marketplace", label: "Vaults"    },
  { href: "/app",         label: "Dashboard" },
  { href: "/abra",        label: "$ABRA"     },
];

const MENU_GROUPS = [
  {
    label: "Operate",
    links: [
      { href: "/onboard",    label: "Get Started"   },
      { href: "/marketplace",label: "Browse Vaults" },
      { href: "/list",       label: "Register Asset"},
      { href: "/formations", label: "Formations"    },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/app",      label: "Dashboard"    },
      { href: "/operator", label: "My Profile"   },
      { href: "/access",   label: "Access & Tiers"},
      { href: "/use",      label: "Use Capital"  },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/live",    label: "Live Feed"   },
      { href: "/defense", label: "Defense Log" },
      { href: "/abra",    label: "$ABRA Token" },
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
        height: "60px",
        display: "grid",
        // Grid: logo | links | right-actions — this prevents wallet button from collapsing the layout
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        padding: "0 1.25rem",
        gap: "1rem",
        background: "rgba(7,10,18,0.95)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>

        {/* Col 1: Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.45)", background: "radial-gradient(circle at 38% 38%, rgba(200,169,110,0.22), transparent 65%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 10px rgba(200,169,110,0.8)" }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", letterSpacing: "0.14em", color: "var(--gold)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              Abraxas
            </span>
          </div>
        </Link>

        {/* Col 2: Desktop nav links — centered */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.75rem" }} className="hidden md:flex">
          {PRIMARY.map((link) => (
            <Link key={link.href} href={link.href} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase",
              textDecoration: "none",
              color: pathname === link.href ? "var(--gold)" : "var(--muted)",
              position: "relative", transition: "color 0.2s", whiteSpace: "nowrap",
            }}>
              {pathname === link.href && (
                <span style={{ position: "absolute", bottom: "-4px", left: 0, right: 0, height: "1px", background: "var(--gold)" }} />
              )}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Col 3: Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end", minWidth: 0 }}>
          {/* Language — desktop only */}
          <div className="hidden md:flex">
            <LanguageSelector />
          </div>

          {/* Wallet — compact mode, never overflows */}
          <div style={{ flexShrink: 0 }}>
            <ConnectWalletButton size="sm" compact />
          </div>

          {/* Get Started — desktop only */}
          <Link href="/onboard" style={{ textDecoration: "none" }} className="hidden md:flex">
            <div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "6px", padding: "0.35rem 0.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", whiteSpace: "nowrap" }}>
              Get Started
            </div>
          </Link>

          {/* Hamburger — always visible, fixed size */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", width: "30px", height: "30px", minWidth: "30px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", cursor: "pointer", flexShrink: 0 }}
          >
            {open
              ? <span style={{ fontSize: "0.75rem", color: "var(--gold)", lineHeight: 1 }}>✕</span>
              : <>
                  <span style={{ width: "13px", height: "1.5px", background: "var(--muted)", borderRadius: "1px" }} />
                  <span style={{ width: "13px", height: "1.5px", background: "var(--muted)", borderRadius: "1px" }} />
                  <span style={{ width: "8px", height: "1.5px", background: "var(--muted)", borderRadius: "1px", alignSelf: "flex-start" }} />
                </>
            }
          </button>
        </div>
      </nav>

      {/* Drawer — all pages grouped */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 49, background: "rgba(3,4,10,0.98)", backdropFilter: "blur(24px)", paddingTop: "60px", overflowY: "auto" }}>
          <div style={{ padding: "1.25rem 1.5rem" }}>
            <Link href="/onboard" style={{ display: "block", textDecoration: "none", marginBottom: "1.5rem" }}>
              <div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "10px", padding: "0.875rem", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Get Started →
              </div>
            </Link>

            {MENU_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {group.label}
                </p>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 0", fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem", fontWeight: pathname === link.href ? 700 : 400, textDecoration: "none", color: pathname === link.href ? "var(--gold)" : "var(--text)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {link.label}
                    {pathname === link.href && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--gold)" }} />}
                  </Link>
                ))}
              </div>
            ))}

            <div style={{ marginBottom: "1rem" }}>
              <LanguageSelector />
            </div>

            <div style={{ padding: "0.875rem 1rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>All Systems Operational</span>
              </div>
              <p style={{ fontSize: "0.68rem", color: "var(--subtle)", marginTop: "0.25rem" }}>5 agents · 5 vaults · $0 unrecovered</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}