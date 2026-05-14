"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type TabId = "studio" | "markets" | "vaults";

const TABS = [
  {
    key: "studio" as TabId,
    label: "III · Studio",
    sublabel: "Tokenize · Issue",
    isInPage: "studio",
    color: "#14F195",
    icon: (active: boolean, color: string) => (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? color : "rgba(255,255,255,0.25)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    key: "markets" as TabId,
    label: "II · Markets",
    sublabel: "Listings · Activity",
    isInPage: "markets",
    color: "#6b8cff",
    icon: (active: boolean, color: string) => (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? color : "rgba(255,255,255,0.25)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    key: "vaults" as TabId,
    label: "I · Capital",
    sublabel: "Vaults · Borrow",
    href: "/protect",
    color: "#C8A96E",
    icon: (active: boolean, color: string) => (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? color : "rgba(255,255,255,0.25)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabId>("markets");

  useEffect(() => {
    const handleTabEvent = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener("abraxas-tab", handleTabEvent);
    return () => window.removeEventListener("abraxas-tab", handleTabEvent);
  }, []);

  const isVaultsPage = pathname?.startsWith("/protect");

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "72px",
        display: "flex",
        alignItems: "stretch",
        background: "rgba(2,3,10,0.96)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TABS.map((tab) => {
        const isActive =
          tab.key === (isVaultsPage ? "vaults" : activeTab);

        return (
          <div
            key={tab.key}
            onClick={() => {
              if (tab.key === "vaults" && "href" in tab) {
                window.location.href = (tab as any).href;
              } else if ("isInPage" in tab) {
                setActiveTab(tab.key);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("abraxas-tab", {
                      detail: (tab as any).isInPage,
                    })
                  );
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }
            }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.22rem",
              position: "relative",
              padding: "0.375rem 0",
              cursor: "pointer",
              background: isActive ? `${tab.color}07` : "transparent",
              borderRight: "1px solid rgba(255,255,255,0.03)",
            }}
          >
            {/* Active glow bar */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "20%",
                  right: "20%",
                  height: "2px",
                  background: tab.color,
                  boxShadow: `0 0 10px ${tab.color}, 0 0 20px ${tab.color}55`,
                  borderRadius: "0 0 2px 2px",
                }}
              />
            )}

            {/* Icon */}
            <div
              style={{
                filter: isActive ? `drop-shadow(0 0 6px ${tab.color})` : "none",
                transition: "filter 0.2s",
              }}
            >
              {tab.icon(isActive, tab.color)}
            </div>

            {/* Labels */}
            <span
              style={{
                fontSize: "0.5rem",
                fontWeight: isActive ? 800 : 400,
                color: isActive ? tab.color : "rgba(255,255,255,0.25)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {tab.label}
            </span>
            <span
              style={{
                fontSize: "0.36rem",
                color: isActive ? `${tab.color}70` : "rgba(255,255,255,0.15)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {tab.sublabel}
            </span>
          </div>
        );
      })}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </nav>
  );
}