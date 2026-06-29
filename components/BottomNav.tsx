"use client";
// FILE: components/BottomNav.tsx
// Mobile bottom nav. Desktop uses SiteNav.

import { usePathname } from "next/navigation";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";

const NAV_ITEMS = [
  { href: "/terminal",  label: "Market",    icon: "\u25c8" },
  { href: "/passport",  label: "Passport",  icon: "\u25ce" },
  { href: "/dashboard", label: "Dash",      icon: "\u25a3" },
  { href: "/build",     label: "Build",     icon: "\u25a1" },
  { href: "/docs",      label: "Docs",      icon: "\u25cf" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="abr-bottom-nav" style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: "var(--nav-bg)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
        borderTop: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-around",
        padding: "0.45rem 0.25rem",
        paddingBottom: "max(0.45rem, env(safe-area-inset-bottom))",
      }}>
        {NAV_ITEMS.map(item => {
          const active = pathname?.startsWith(item.href);
          return (
            <a key={item.label} href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.15rem",
                padding: "0.35rem 0.4rem",
                borderRadius: 10,
                textDecoration: "none",
                color: active ? G : "var(--text-secondary)",
                background: active ? "rgba(16,185,129,0.14)" : "transparent",
                minWidth: 52,
              }}>
              <span style={{ fontSize: "0.95rem" }}>{item.icon}</span>
              <span style={{ fontFamily: S, fontSize: "0.55rem", fontWeight: 600 }}>
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>
      <div className="abr-bottom-nav-spacer" style={{ height: "4rem" }} aria-hidden="true" />
      <style>{`
        @media (min-width: 1100px) {
          .abr-bottom-nav, .abr-bottom-nav-spacer { display: none !important; }
        }
      `}</style>
    </>
  );
}
