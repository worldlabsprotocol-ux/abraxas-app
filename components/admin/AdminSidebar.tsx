"use client";
// FILE: components/admin/AdminSidebar.tsx
// Protocol admin navigation — desktop sidebar and mobile drawer.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAdminProtocolNavItems,
  isAdminNavItemActive,
} from "@/lib/admin/adminNav";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const SIDEBAR_WIDTH = 248;

interface AdminSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname() ?? "";
  const items = getAdminProtocolNavItems();

  const navContent = (
    <>
      <div style={{ padding: "1.15rem 1rem 0.85rem" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.35rem",
        }}>
          Admin console
        </div>
        <div style={{
          fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
          color: "#f0f0f0", letterSpacing: "-0.02em",
        }}>
          Protocol
        </div>
      </div>

      <nav aria-label="Admin protocol navigation" style={{ padding: "0 0.65rem 1rem" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.25rem" }}>
          {items.map(item => {
            const active = isAdminNavItemActive(pathname, item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  title={item.description}
                  style={{
                    display: "block",
                    padding: "0.62rem 0.75rem",
                    borderRadius: 10,
                    textDecoration: "none",
                    border: `1px solid ${active ? `${ACCENT}55` : "transparent"}`,
                    background: active ? "rgba(16,185,129,0.12)" : "transparent",
                    color: active ? "#D1FAE5" : "rgba(255,255,255,0.78)",
                    fontFamily: FONT,
                    fontSize: "0.82rem",
                    fontWeight: active ? 700 : 600,
                    lineHeight: 1.35,
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{
        marginTop: "auto",
        padding: "0.85rem 1rem 1.15rem",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        <Link
          href="/"
          onClick={onClose}
          style={{
            fontFamily: FONT,
            fontSize: "0.76rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.55)",
            textDecoration: "none",
          }}
        >
          ← Back to site
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Admin sidebar"
        className="admin-sidebar-desktop"
        style={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "#080a0e",
          display: "none",
          flexDirection: "column",
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
        }}
      >
        {navContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            border: "none",
            background: "rgba(0,0,0,0.55)",
            cursor: "pointer",
          }}
        />
      )}

      <aside
        aria-label="Admin navigation drawer"
        aria-hidden={!mobileOpen}
        className="admin-sidebar-mobile"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(86vw, 300px)",
          zIndex: 50,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "#080a0e",
          display: "flex",
          flexDirection: "column",
          transform: mobileOpen ? "translateX(0)" : "translateX(-105%)",
          transition: "transform 0.2s ease",
          boxShadow: mobileOpen ? "0 12px 40px rgba(0,0,0,0.45)" : "none",
        }}
      >
        {navContent}
      </aside>

      <style>{`
        @media (min-width: 900px) {
          .admin-sidebar-desktop { display: flex !important; }
          .admin-sidebar-mobile { display: none !important; }
        }
        @media (max-width: 899px) {
          .admin-sidebar-desktop { display: none !important; }
        }
      `}</style>
    </>
  );
}
