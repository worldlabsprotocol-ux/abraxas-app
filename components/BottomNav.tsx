"use client";
// FILE: components/BottomNav.tsx
// The ONE persistent navigation system for the app. Used by every
// primary screen: Marketplace, Dashboard, Swap, Gallery, Registry.
// Active state is now genuinely dynamic (reads the real URL), fixing
// a real bug where "Market" was hardcoded as active everywhere,
// including on pages that aren't the marketplace at all.

import { usePathname } from "next/navigation";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";
const BDR = "#E5E5E0";

const NAV_ITEMS = [
  { href: "/terminal",  label: "Market",    icon: "\u25c8" },
  { href: "/dashboard", label: "Dashboard", icon: "\u25a3" },
  { href: "/swap",      label: "Swap",      icon: "\u21c6" },
  { href: "/gallery",   label: "Gallery",   icon: "\u25c6" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200,
                     background:"var(--nav-bg)",
                     borderTop:`1px solid ${BDR}`,
                     display:"flex", justifyContent:"space-around",
                     padding:"0.5rem clamp(0.5rem,2vw,1rem)",
                     paddingBottom:"max(0.5rem, env(safe-area-inset-bottom))" }}>
        {NAV_ITEMS.map(item => {
          const active = pathname?.startsWith(item.href);
          return (
            <a key={item.label} href={item.href}
              style={{ display:"flex", flexDirection:"column", alignItems:"center",
                        gap:"0.2rem", padding:"0.4rem 0.75rem", borderRadius:10,
                        textDecoration:"none",
                        color: active ? G : "var(--text-secondary)",
                        background: active ? `${G}14` : "transparent",
                        minWidth:60 }}>
              <span style={{ fontSize:"1.05rem" }}>{item.icon}</span>
              <span style={{ fontFamily:S, fontSize:"0.62rem", fontWeight:600 }}>
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>
      {/* Spacer so fixed nav never overlaps page content */}
      <div style={{ height:"4.25rem" }} aria-hidden="true" />
    </>
  );
}
