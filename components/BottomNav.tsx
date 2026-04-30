"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/**
 * BottomNav — 3 fixed bottom buttons for mobile-first navigation.
 * Jeff Yan principle: one action per thumb zone.
 * 
 * Account | Operate | System
 * Each expands into a minimal tray of the most-used links.
 */

const TABS = [
  {
    key: "account",
    icon: "◎",
    label: "Account",
    links: [
      { href: "/app",      label: "Dashboard"    },
      { href: "/operator", label: "My Profile"   },
      { href: "/stake",    label: "Staking"      },
      { href: "/use",      label: "Use Capital"  },
    ],
  },
  {
    key: "operate",
    icon: "◈",
    label: "Operate",
    links: [
      { href: "/onboard",    label: "Get Started"    },
      { href: "/earn",       label: "Earn Yield"     },
      { href: "/marketplace",label: "Browse Vaults"  },
      { href: "/list",       label: "Register Asset" },
    ],
    primary: true,
  },
  {
    key: "system",
    icon: "⬡",
    label: "System",
    links: [
      { href: "/live",    label: "Live Feed"    },
      { href: "/abra",    label: "$ABRA"        },
      { href: "/why",     label: "Why Abraxas"  },
      { href: "/defense", label: "Defense Log"  },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => setOpen(open === key ? null : key);
  const activeTab = TABS.find((t) => t.links.some((l) => l.href === pathname));

  return (
    <>
      {/* Tray overlay */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 38, background: "rgba(0,0,0,0.3)" }}
          onClick={() => setOpen(null)}
        />
      )}

      {/* Link tray */}
      {TABS.map((tab) =>
        open === tab.key ? (
          <div
            key={tab.key}
            style={{
              position: "fixed",
              bottom: "64px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 39,
              background: "rgba(10,13,26,0.97)",
              border: "1px solid var(--line-bright)",
              borderRadius: "14px",
              padding: "0.5rem",
              minWidth: "200px",
              backdropFilter: "blur(24px)",
            }}
          >
            {tab.links.map((link) => (
              <button
                key={link.href}
                onClick={() => { router.push(link.href); setOpen(null); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: pathname === link.href ? "rgba(200,169,110,0.1)" : "none",
                  border: "none", borderRadius: "8px",
                  padding: "0.7rem 1rem", cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: pathname === link.href ? 700 : 400,
                  color: pathname === link.href ? "var(--gold)" : "var(--text)",
                  transition: "background 0.15s",
                }}
              >
                {link.label}
                {pathname === link.href && (
                  <span style={{ float: "right", color: "var(--gold)", fontSize: "0.5rem" }}>●</span>
                )}
              </button>
            ))}
          </div>
        ) : null
      )}

      {/* Bottom bar */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 40,
        height: "64px",
        background: "rgba(2,3,10,0.97)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab?.key === tab.key || open === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => toggle(tab.key)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px", background: "none", border: "none",
                cursor: "pointer", position: "relative",
                transition: "all 0.15s",
              }}
            >
              {/* Active indicator top */}
              {isActive && (
                <div style={{
                  position: "absolute", top: 0, left: "25%", right: "25%",
                  height: "2px",
                  background: tab.primary ? "var(--gold)" : "var(--gold)",
                  borderRadius: "0 0 2px 2px",
                }} />
              )}

              <span style={{
                fontSize: tab.primary ? "1rem" : "0.875rem",
                color: isActive ? "var(--gold)" : "var(--subtle)",
                lineHeight: 1,
                transition: "color 0.15s",
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: "0.58rem",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: isActive ? 700 : 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: isActive ? "var(--gold)" : "var(--subtle)",
                transition: "color 0.15s",
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