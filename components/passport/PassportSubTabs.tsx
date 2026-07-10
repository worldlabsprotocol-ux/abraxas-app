"use client";
// FILE: components/passport/PassportSubTabs.tsx
// Four canonical sections — Profile, Verification, Wallets, Access.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export type PassportSubTab = "profile" | "verification" | "wallets" | "access";

const TABS: Array<{ id: PassportSubTab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "verification", label: "Verification" },
  { id: "wallets", label: "Wallets" },
  { id: "access", label: "Access" },
];

const TAB_ALIASES: Record<string, PassportSubTab> = {
  overview: "profile",
  approvals: "verification",
  verifications: "verification",
  activity: "access",
};

export function PassportSubTabs({ active }: { active: PassportSubTab }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = pathname?.split("?")[0] ?? "/passport";

  function tabHref(tab: PassportSubTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    if (tab === "profile") params.delete("tab");
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
  if (!value) return "profile";
  if (value in TAB_ALIASES) return TAB_ALIASES[value];
  if (value === "profile" || value === "verification" || value === "wallets" || value === "access") {
    return value;
  }
  return "profile";
}
