// FILE: components/Nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

const LINKS = [
  { href: "/",            label: "Home"      },
  { href: "/marketplace", label: "Vaults"    },
  { href: "/onboard",     label: "Operate"   },
  { href: "/app",         label: "Dashboard" },
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
        padding: "0 1rem", gap: "1rem",
        background: "rgba(2,3,10,0.96)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 8px rgba(200,169,110,0.9)" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.14em", color: "var(--gold)", textTransform: "uppercase" }}>
              Abraxas
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div style={{ display: "none", alignItems: "center", gap: "1.75rem", flex: 1, marginLeft: "1rem" }} className="md:flex">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} style={{
                fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase",
                textDecoration: "none", fontWeight: active ? 700 : 400,
                color: active ? "var(--gold)" : "var(--muted)",
                position: "relative",
              }}>
                {active && <span style={{ position: "absolute", bottom: "-4px", left: 0, right: 0, height: "1px", background: "var(--gold)" }} />}
                {l.label}
              </Link>
            );
          })}
        </div>

        <div style={{ flex: 1 }} className="md:hidden" />

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
          <ConnectWalletButton size="sm" compact />
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu"
            className="md:hidden"
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", width: "30px", height: "30px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", padding: 0 }}>
            {open
              ? <span style={{ fontSize: "0.78rem", color: "var(--gold)", lineHeight: 1 }}>✕</span>
              : <>
                  <span style={{ width: "14px", height: "1.5px", background: "var(--muted)", borderRadius: "1px", display: "block" }} />
                  <span style={{ width: "14px", height: "1.5px", background: "var(--muted)", borderRadius: "1px", display: "block" }} />
                </>
            }
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden" style={{
          position: "fixed", inset: 0, zIndex: 49,
          background: "rgba(2,3,10,0.98)", backdropFilter: "blur(24px)",
          paddingTop: "56px", overflowY: "auto",
        }}>
          <div style={{ padding: "1.5rem 1.25rem 4rem" }}>
            {LINKS.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link key={l.href} href={l.href} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "1rem 0", fontSize: "1.1rem",
                  fontWeight: active ? 700 : 400, textDecoration: "none",
                  color: active ? "var(--gold)" : "var(--text)",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  {l.label}
                  {active && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--gold)" }} />}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}