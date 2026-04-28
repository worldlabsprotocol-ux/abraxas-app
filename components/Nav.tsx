"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authState";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { LanguageSelector } from "@/components/LanguageSelector";

// Jeff Yan audit: 4 nav items max. Everything else in hamburger.
// "Get Started" is the primary CTA — gold, always visible.
const navLinks = [
  { href: "/marketplace", label: "Vaults"     },
  { href: "/app",         label: "Dashboard"  },
  { href: "/abra",        label: "$ABRA"      },
];

export function Nav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { loggedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: "60px", display: "flex", alignItems: "center",
        padding: "0 1.5rem", gap: "1rem",
        background: "rgba(7,10,18,0.92)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", marginRight: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              border: "1px solid rgba(200,169,110,0.5)",
              background: "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.25), transparent 70%)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 10px var(--gold)" }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.15em", color: "var(--gold)", textTransform: "uppercase" }}>
              Abraxas
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.72rem", letterSpacing: "0.08em",
              textTransform: "uppercase", textDecoration: "none",
              color: pathname === link.href ? "var(--gold)" : "var(--muted)",
              transition: "color 0.2s", position: "relative",
            }}>
              {pathname === link.href && (
                <span style={{ position: "absolute", bottom: "-4px", left: 0, right: 0, height: "1px", background: "var(--gold)", borderRadius: "1px" }} />
              )}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right — language + wallet + CTA */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSelector />
          <ConnectWalletButton size="sm" />
          <Link href="/onboard" style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--gold)", color: "var(--void)",
              borderRadius: "6px", padding: "0.4rem 0.875rem",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: "0.68rem",
              textTransform: "uppercase", letterSpacing: "0.06em",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
              Get Started
            </div>
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSelector />
          <ConnectWalletButton size="sm" />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px", padding: "0.4rem 0.5rem",
              cursor: "pointer", display: "flex", flexDirection: "column",
              gap: "4px", alignItems: "center", justifyContent: "center",
              width: "34px", height: "34px",
            }}
          >
            {mobileOpen
              ? <span style={{ fontSize: "1rem", color: "var(--gold)", lineHeight: 1 }}>✕</span>
              : <>
                  <span style={{ display: "block", width: "16px", height: "1.5px", background: "var(--muted)", borderRadius: "1px" }} />
                  <span style={{ display: "block", width: "16px", height: "1.5px", background: "var(--muted)", borderRadius: "1px" }} />
                  <span style={{ display: "block", width: "10px", height: "1.5px", background: "var(--muted)", borderRadius: "1px", alignSelf: "flex-start" }} />
                </>
            }
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden" style={{
          position: "fixed", inset: 0, zIndex: 49,
          background: "rgba(3,4,10,0.97)", backdropFilter: "blur(20px)",
          paddingTop: "60px", display: "flex", flexDirection: "column",
        }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
            {/* Primary CTA */}
            <Link href="/onboard" style={{ display: "block", textDecoration: "none", marginBottom: "1.5rem" }}>
              <div style={{
                background: "var(--gold)", color: "var(--void)",
                borderRadius: "10px", padding: "1rem",
                textAlign: "center", fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700, fontSize: "0.875rem",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Get Started →
              </div>
            </Link>

            {/* All links */}
            {[
              { href: "/",            label: "Home"        },
              { href: "/marketplace", label: "Vaults"      },
              { href: "/app",         label: "Dashboard"   },
              { href: "/abra",        label: "$ABRA"       },
              { href: "/live",        label: "Live Feed"   },
              { href: "/formations",  label: "Formations"  },
              { href: "/access",      label: "Access"      },
              { href: "/operator",    label: "My Profile"  },
              { href: "/defense",     label: "Defense Log" },
            ].map((link) => (
              <Link key={link.href} href={link.href} style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: pathname === link.href ? 700 : 400,
                fontSize: "1.05rem", letterSpacing: "0.03em",
                textDecoration: "none",
                color: pathname === link.href ? "var(--gold)" : "var(--text)",
                padding: "0.875rem 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                {link.label}
                {pathname === link.href && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)" }} />}
              </Link>
            ))}

            {/* System status */}
            <div style={{ padding: "1rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", marginTop: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>All Systems Operational</span>
              </div>
              <p style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>5 agents · All vaults active · $0 unrecovered</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}