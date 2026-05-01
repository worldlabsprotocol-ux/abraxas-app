"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/**
 * BottomNav — 3 fixed app-style bottom buttons.
 * Account | Operate | System
 * Exactly like Phantom, Jupiter, Uniswap mobile.
 * Each tab expands a tray. Tray closes on link tap or outside tap.
 */

const TABS = [
  {
    key: "account",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "var(--subtle)"} strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    label: "Account",
    links: [
      { href: "/app",      label: "Dashboard"  },
      { href: "/operator", label: "My Profile" },
      { href: "/stake",    label: "Staking"    },
      { href: "/use",      label: "Use Capital"},
    ],
  },
  {
    key: "operate",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "var(--subtle)"} strokeWidth="1.8">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    label: "Operate",
    primary: true,
    links: [
      { href: "/onboard",    label: "Get Started"    },
      { href: "/earn",       label: "Earn Yield"     },
      { href: "/marketplace",label: "Browse Vaults"  },
      { href: "/list",       label: "Register Asset" },
    ],
  },
  {
    key: "system",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "var(--subtle)"} strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    label: "System",
    links: [
      { href: "/live",       label: "Live Feed"     },
      { href: "/abra",       label: "$ABRA"         },
      { href: "/why",        label: "Why Abraxas"   },
      { href: "/demo",       label: "Demo Dashboard"},
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => setOpen(open === key ? null : key);
  const activeKey = TABS.find((t) => t.links.some((l) => l.href === pathname))?.key;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(null)}
          style={{ position: "fixed", inset: 0, zIndex: 38, background: "rgba(0,0,0,0.45)" }}
        />
      )}

      {/* Tray */}
      {TABS.map((tab) => open === tab.key && (
        <div key={tab.key} style={{
          position: "fixed", bottom: "64px",
          left: "50%", transform: "translateX(-50%)",
          zIndex: 39,
          background: "rgba(10,13,26,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "0.5rem 0.375rem",
          minWidth: "210px",
          backdropFilter: "blur(30px)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.6)",
        }}>
          {tab.links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <button
                key={link.href}
                onClick={() => { router.push(link.href); setOpen(null); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", textAlign: "left",
                  background: isActive ? "rgba(200,169,110,0.12)" : "none",
                  border: "none", borderRadius: "10px",
                  padding: "0.75rem 0.875rem",
                  cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "var(--gold)" : "var(--text)",
                  transition: "background 0.15s",
                  marginBottom: "2px",
                }}
              >
                {link.label}
                {isActive && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--gold)", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      ))}

      {/* Bottom bar — fixed, always visible */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 40, height: "64px",
        background: "rgba(2,3,10,0.97)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        alignItems: "center",
      }}>
        {TABS.map((tab) => {
          const isActive = activeKey === tab.key || open === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => toggle(tab.key)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", height: "100%",
                background: "none", border: "none",
                cursor: "pointer", position: "relative",
              }}
            >
              {/* Active top line */}
              {isActive && (
                <div style={{
                  position: "absolute", top: 0,
                  left: "20%", right: "20%", height: "2px",
                  background: "var(--gold)",
                  borderRadius: "0 0 2px 2px",
                }} />
              )}
              {tab.icon(isActive)}
              <span style={{
                fontSize: "0.56rem",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: isActive ? 700 : 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isActive ? "var(--gold)" : "var(--subtle)",
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}