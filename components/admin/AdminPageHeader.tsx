"use client";
// FILE: components/admin/AdminPageHeader.tsx
// Minimal shell header — mobile menu trigger and active section label only.

import { resolveActiveAdminNavItem } from "@/lib/admin/adminNav";
import { usePathname } from "next/navigation";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface AdminPageHeaderProps {
  onMenuToggle: () => void;
}

export function AdminPageHeader({ onMenuToggle }: AdminPageHeaderProps) {
  const pathname = usePathname() ?? "";
  const active = resolveActiveAdminNavItem(pathname);
  const title = active?.label ?? "Admin";

  return (
    <header
      className="admin-page-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "#0a0c10",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <button
        type="button"
        className="admin-menu-button"
        onClick={onMenuToggle}
        aria-label="Open admin navigation"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "#f0f0f0",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: "1.1rem", lineHeight: 1 }}>☰</span>
      </button>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.5rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.15rem",
        }}>
          Admin console
        </div>
        <div style={{
          fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700,
          color: "#f0f0f0", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {title}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .admin-page-header { display: none !important; }
        }
      `}</style>
    </header>
  );
}
