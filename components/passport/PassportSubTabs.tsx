"use client";
// FILE: components/passport/PassportSubTabs.tsx
// Profile-area tabs — Overview, Wallets, Verifications, Activity.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export type PassportSubTab = "overview" | "wallets" | "verifications" | "activity";

const TABS: Array<{ id: PassportSubTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "wallets", label: "Wallets" },
  { id: "verifications", label: "Verifications" },
  { id: "activity", label: "Activity" },
];

export function PassportSubTabs({ active }: { active: PassportSubTab }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = pathname?.split("?")[0] ?? "/passport";

  function tabHref(tab: PassportSubTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    return q ? `${base}?${q}` : base;
  }

  return (
    <div style={{
      display: "flex", gap: "0.25rem", flexWrap: "wrap",
      marginBottom: "1.25rem", borderBottom: "1px solid var(--border)",
      paddingBottom: "0.35rem",
    }} role="tablist" aria-label="Passport sections">
      {TABS.map(tab => (
        <Link
          key={tab.id}
          href={tabHref(tab.id)}
          role="tab"
          aria-selected={active === tab.id}
          style={{
            padding: "0.45rem 0.85rem", borderRadius: 8, textDecoration: "none",
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            color: active === tab.id ? ACCENT : "var(--text-muted)",
            borderBottom: active === tab.id ? `2px solid ${ACCENT}` : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function parsePassportSubTab(value: string | null): PassportSubTab {
  if (value === "wallets" || value === "verifications" || value === "activity") return value;
  return "overview";
}
