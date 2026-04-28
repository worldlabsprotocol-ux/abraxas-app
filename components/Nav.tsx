"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authState";
import { Button } from "@/components/Button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

const navLinks = [
  { href: "/",            label: "Home"        },
  { href: "/marketplace", label: "Vaults"      },
  { href: "/live",        label: "Live"        },
  { href: "/app",         label: "Dashboard"   },
  { href: "/onboard",     label: "Get Started" },
  { href: "/formations",  label: "Formations"  },
  { href: "/access",      label: "Access"      },
  { href: "/abra",        label: "$ABRA"       },
  { href: "/operator",    label: "My Profile"  },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { loggedIn, walletConnected } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: "60px", display: "flex", alignItems: "center",
        padding: "0 1.25rem", gap: "1rem",
        background: "rgba(7,10,18,0.92)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", marginRight: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.5)", background: "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.25), transparent 70%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.15em", color: "var(--gold)", textTransform: "uppercase" }}>
              Abraxas
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.68rem", letterSpacing: "0.08em",
              textTransform: "uppercase", textDecoration: "none",
              color: pathname === link.href ? "var(--gold)" : "var(--muted)",
              transition: "color 0.2s", position: "relative",
            }} className="hover:text-gold transition-colors">
              {pathname === link.href && (
                <span style={{ position: "absolute", bottom: "-4px", left: 0, right: 0, height: "1px", background: "var(--gold)", borderRadius: "1px" }} />
              )}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-2">
          {!loggedIn && !walletConnected && (
            <Button size="sm" variant="ghost" onClick={() => router.push("/login")}>
              Sign In
            </Button>
          )}
          <ConnectWalletButton size="sm" />
        </div>

        {/* Mobile: wallet + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ConnectWalletButton size="sm" />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px", padding: "0.4rem 0.5rem",
              cursor: "pointer", color: "var(--text)",
              display: "flex", flexDirection: "column", gap: "4px",
              alignItems: "center", justifyContent: "center",
              width: "34px", height: "34px",
            }}
          >
            {mobileOpen ? (
              <span style={{ fontSize: "1rem", color: "var(--gold)", lineHeight: 1 }}>✕</span>
            ) : (
              <>
                <span style={{ display: "block", width: "16px", height: "1.5px", background: mobileOpen ? "var(--gold)" : "var(--muted)", borderRadius: "1px", transition: "background 0.2s" }} />
                <span style={{ display: "block", width: "16px", height: "1.5px", background: mobileOpen ? "var(--gold)" : "var(--muted)", borderRadius: "1px", transition: "background 0.2s" }} />
                <span style={{ display: "block", width: "10px", height: "1.5px", background: mobileOpen ? "var(--gold)" : "var(--muted)", borderRadius: "1px", transition: "background 0.2s", alignSelf: "flex-start" }} />
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 49,
            background: "rgba(3,4,10,0.97)",
            backdropFilter: "blur(20px)",
            paddingTop: "60px",
            display: "flex",
            flexDirection: "column",
          }}
          className="md:hidden"
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 1.25rem" }}>

            {/* Nav links */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "2rem" }}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: pathname === link.href ? 700 : 400,
                    fontSize: "1.1rem",
                    letterSpacing: "0.04em",
                    textDecoration: "none",
                    color: pathname === link.href ? "var(--gold)" : "var(--text)",
                    padding: "0.875rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "color 0.15s",
                  }}
                >
                  {link.label}
                  {pathname === link.href && (
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)" }} />
                  )}
                </Link>
              ))}
            </div>

            {/* Auth */}
            {!loggedIn && (
              <div style={{ marginBottom: "1.5rem" }}>
                <Button fullWidth size="lg" onClick={() => router.push("/login")}>
                  Sign In
                </Button>
              </div>
            )}

            {/* System status */}
            <div style={{ padding: "1rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text)" }}>Operational</span>
              </div>
              <p style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>
                5 agents online · All vaults active · $0 unrecovered
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}