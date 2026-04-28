"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authState";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

// Trimmed to 4 primary destinations — everything else lives inside these
const navLinks = [
  { href: "/marketplace", label: "Vaults"     },
  { href: "/app",         label: "Dashboard"  },
  { href: "/abra",        label: "$ABRA"      },
  { href: "/onboard",     label: "Get Started", primary: true },
];

export function Nav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { loggedIn, walletConnected } = useAuth();
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
        padding: "0 1.5rem", gap: "1.5rem",
        background: "rgba(7,10,18,0.92)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", marginRight: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "50%",
              border: "1px solid rgba(200,169,110,0.5)",
              background: "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.25), transparent 70%)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.15em", color: "var(--gold)", textTransform: "uppercase" }}>
              Abraxas
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.72rem", letterSpacing: "0.08em",
              textTransform: "uppercase", textDecoration: "none",
              color: link.primary
                ? "var(--void)"
                : pathname === link.href ? "var(--gold)" : "var(--muted)",
              background: link.primary ? "var(--gold)" : "transparent",
              padding: link.primary ? "0.4rem 1rem" : "0",
              borderRadius: link.primary ? "6px" : "0",
              fontWeight: link.primary ? 700 : 400,
              transition: "all 0.2s",
              position: "relative",
            }}>
              {!link.primary && pathname === link.href && (
                <span style={{ position: "absolute", bottom: "-4px", left: 0, right: 0, height: "1px", background: "var(--gold)", borderRadius: "1px" }} />
              )}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <div className="hidden md:flex items-center">
          <ConnectWalletButton size="sm" />
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
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
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "2rem" }}>
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
                  fontSize: "1.1rem", letterSpacing: "0.04em",
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
            </div>

            <Link href="/onboard" style={{ display: "block", textDecoration: "none" }}>
              <div style={{
                background: "var(--gold)", color: "var(--void)",
                borderRadius: "10px", padding: "1rem",
                textAlign: "center", fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700, fontSize: "0.875rem",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: "1.5rem",
              }}>
                Get Started →
              </div>
            </Link>

            <div style={{ padding: "1rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Operational</span>
              </div>
              <p style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>5 agents · All vaults active · $0 unrecovered</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}