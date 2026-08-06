"use client";
// FILE: components/admin/IdentityReviewSubNav.tsx

import Link from "next/link";
import { ADMIN_IDENTITY_NAV } from "@/lib/admin/adminIdentityNav";
import {
  IDENTITY_REVIEW_QUEUE_TABS,
  type IdentityReviewQueueTabId,
} from "@/lib/admin/identityReviewQueueStates";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface IdentityReviewSubNavProps {
  activeTabId: IdentityReviewQueueTabId;
}

export function IdentityReviewSubNav({ activeTabId }: IdentityReviewSubNavProps) {
  return (
    <nav
      aria-label="Identity review admin navigation"
      style={{
        marginBottom: "1.25rem",
        padding: "0.85rem 1rem",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "0.75rem",
        flexWrap: "wrap",
        marginBottom: "0.85rem",
      }}
      >
        <div>
          <div style={{
            fontFamily: MONO,
            fontSize: "0.55rem",
            color: ACCENT,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
          >
            {ADMIN_IDENTITY_NAV.sectionLabel}
          </div>
          <h1 style={{ fontFamily: FONT, fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#f0f0f0" }}>
            {ADMIN_IDENTITY_NAV.label}
          </h1>
        </div>
        <Link
          href={ADMIN_IDENTITY_NAV.backToPassportHref}
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            color: ACCENT,
            textDecoration: "none",
            fontWeight: 600,
            whiteSpace: "nowrap",
            padding: "0.35rem 0",
          }}
        >
          ← {ADMIN_IDENTITY_NAV.backToPassportLabel}
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Identity review queue states"
        style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}
      >
        {IDENTITY_REVIEW_QUEUE_TABS.map(tab => {
          const active = tab.id === activeTabId;
          return (
            <Link
              key={tab.id}
              href={`/admin/identity?status=${encodeURIComponent(tab.queryStatus)}`}
              role="tab"
              aria-selected={active}
              style={{
                padding: "0.42rem 0.75rem",
                borderRadius: 999,
                border: `1px solid ${active ? `${ACCENT}88` : "rgba(255,255,255,0.12)"}`,
                background: active ? `${ACCENT}18` : "transparent",
                color: active ? "#D1FAE5" : "rgba(255,255,255,0.72)",
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: active ? 700 : 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
