"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authState";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { LanguageSelector } from "@/components/LanguageSelector";

// 3 nav items + gold CTA — everything else in hamburger grouped logically
const PRIMARY = [
  { href: "/marketplace", label: "Vaults" },
  { href: "/app",         label: "Dashboard" },
  { href: "/abra",        label: "$ABRA" },
];

// Hamburger groups
const MENU_GROUPS = [
  {
    label: "Operate",
    links: [
      { href: "/onboard",    label: "Get Started" },
      { href: "/marketplace",label: "Browse Vaults" },
      { href: "/list",       label: "Register Asset" },
      { href: "/formations", label: "Formations" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/app",        label: "Dashboard" },
      { href: "/operator",   label: "My Profile" },
      { href: "/access",     label: "Access & Tiers" },
      { href: "/use",        label: "Use Capital" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/live",       label: "Live Feed" },
      { href: "/defense",    label: "Defense Log" },
      { href: "/abra",       label: "$ABRA Token" },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { loggedIn } = useAuth();
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
        height: "60px", display: "flex", alignItems: "center",
        padding: "0 1.5rem", gap: "1rem",
        background: "rgba(7,10,18,0.95)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", marginRight: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.45)", background: "radial-gradient(circle at 38% 38%, rgba(200,169,110,0.22), transparent 65%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 12px rgba(200,169,110,0.8)" }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.14em", color: "var(--gold)", textTransform: "uppercase" }}>
              Abraxas
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {PRIMARY.map((link) => (
            <Link key={link.href} href={link.href} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase",
              textDecoration: "none",
              color: pathname === link.href ? "var(--gold)" : "var(--muted)",
              position: "relative", transition: "color 0.2s",
            }}>
              {pathname === link.href && (
                <span style={{ position: "absolute", bottom: "-4px", left: 0, right: 0, height: "1px", background: "var(--gold)" }} />
              )}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSelector />
          <ConnectWalletButton size="sm" />
          <Link href="/onboard" style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "6px", padding: "0.38rem 0.875rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
              Get Started
            </div>
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSelector />
          <ConnectWalletButton size="sm" />
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu"
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", width: "34px", height: "34px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer" }}>
            {open
              ? <span style={{ fontSize: "0.875rem", color: "var(--gold)" }}>✕</span>
              : <>
                  <span style={{ width: "16px", height: "1.5px", background: "var(--muted)", borderRadius: "1px" }} />
                  <span style={{ width: "16px", height: "1.5px", background: "var(--muted)", borderRadius: "1px" }} />
                  <span style={{ width: "10px", height: "1.5px", background: "var(--muted)", borderRadius: "1px", alignSelf: "flex-start" }} />
                </>
            }
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 49, background: "rgba(3,4,10,0.98)", backdropFilter: "blur(24px)", paddingTop: "60px", overflowY: "auto" }}>
          <div style={{ padding: "1.5rem" }}>
            {/* Primary CTA */}
            <Link href="/onboard" style={{ display: "block", textDecoration: "none", marginBottom: "2rem" }}>
              <div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "10px", padding: "1rem", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Get Started →
              </div>
            </Link>

            {/* Grouped links */}
            {MENU_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: "1.75rem" }}>
                <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {group.label}
                </p>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.7rem 0",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "1rem", fontWeight: pathname === link.href ? 700 : 400,
                    textDecoration: "none",
                    color: pathname === link.href ? "var(--gold)" : "var(--text)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    {link.label}
                    {pathname === link.href && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--gold)" }} />}
                  </Link>
                ))}
              </div>
            ))}

            {/* Status */}
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