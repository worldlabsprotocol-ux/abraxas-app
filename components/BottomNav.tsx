"use client";
// FILE: components/BottomNav.tsx
// Mobile bottom nav. Desktop uses SiteNav / RedesignNav.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { springSnappy } from "@/lib/motion/variants";
import {
  BOTTOM_NAV_ACCOUNT_HREF,
  BOTTOM_NAV_ACCOUNT_LABEL,
} from "@/lib/integrate/partnerJourney";

const MotionLink = motion.create(Link);

const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";

const NAV_ITEMS = [
  { href: "/terminal", label: "Market", icon: "\u25c8" },
  { href: "/passport", label: "Passport", icon: "\u25ce" },
  { href: BOTTOM_NAV_ACCOUNT_HREF, label: BOTTOM_NAV_ACCOUNT_LABEL, icon: "\u25a3" },
  { href: "/build", label: "Build", icon: "\u25a1" },
  { href: "/docs", label: "Docs", icon: "\u25cf" },
];

export function BottomNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <>
      <nav
        className="abr-bottom-nav"
        aria-label="Mobile navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: "var(--nav-bg-solid)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-around",
          padding: "0.5rem clamp(0.5rem, 2vw, 1rem)",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {NAV_ITEMS.map(item => {
          const active = pathname?.startsWith(item.href);
          return (
            <MotionLink
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              whileTap={reduce ? undefined : { scale: 0.9 }}
              transition={springSnappy}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                padding: "0.4rem 0.65rem",
                borderRadius: 12,
                textDecoration: "none",
                color: active ? G : "var(--text-secondary)",
                minWidth: 58,
              }}
            >
              {active && (
                <motion.span
                  layoutId="bottomNavActivePill"
                  transition={springSnappy}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 12,
                    background: "rgba(16,185,129,0.14)",
                    zIndex: -1,
                  }}
                />
              )}
              <motion.span
                style={{ fontSize: "1.05rem" }}
                animate={reduce ? undefined : { scale: active ? 1.15 : 1 }}
                transition={springSnappy}
              >
                {item.icon}
              </motion.span>
              <span style={{ fontFamily: S, fontSize: "0.6rem", fontWeight: 600 }}>
                {item.label}
              </span>
            </MotionLink>
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
