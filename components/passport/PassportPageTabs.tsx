"use client";
// FILE: components/passport/PassportPageTabs.tsx
// Top-level switch between Passport setup and holder-facing verify tools.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export type PassportPageView = "passport" | "verify";

function holderVerifyMode(mode: string | null): string {
  if (mode === "credential" || mode === "policy") return "credential";
  return "registry";
}

export function PassportPageTabs({ active }: { active: PassportPageView }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onVerifyRoute = pathname?.startsWith("/verify");

  const tabs: Array<{ id: PassportPageView; label: string; href: string }> = [
    { id: "passport", label: "My Passport", href: "/passport" },
    {
      id: "verify",
      label: "Verify",
      href: onVerifyRoute
        ? `/verify?mode=${searchParams.get("mode") ?? "receipt"}`
        : `/passport?view=verify&mode=${holderVerifyMode(searchParams.get("mode"))}`,
    },
  ];

  return (
    <div style={{
      display: "flex", gap: "0.35rem", flexWrap: "wrap",
      padding: "0.25rem", borderRadius: 999, marginBottom: "1.25rem",
      background: "var(--surface-inset)", border: "1px solid var(--border)",
    }}>
      {tabs.map(tab => (
        <Link
          key={tab.id}
          href={tab.href}
          style={{
            padding: "0.5rem 1rem", borderRadius: 999, textDecoration: "none",
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            background: active === tab.id ? ACCENT : "transparent",
            color: active === tab.id ? "#04130C" : "var(--text-secondary)",
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
