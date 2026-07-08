"use client";
// FILE: components/passport/PassportPageTabs.tsx
// Top-level switch between Passport setup and Verify tools on one page.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export type PassportPageView = "passport" | "verify";

export function PassportPageTabs({ active }: { active: PassportPageView }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const verifyMode = searchParams.get("mode");

  function verifyHref(mode?: string) {
    const base = pathname?.startsWith("/verify") ? "/verify" : "/passport";
    const params = new URLSearchParams();
    params.set("view", "verify");
    if (mode) params.set("mode", mode);
    return `${base}?${params.toString()}`;
  }

  function passportHref() {
    const base = pathname?.startsWith("/verify") ? "/passport" : (pathname ?? "/passport");
    return base.split("?")[0];
  }

  const tabs: Array<{ id: PassportPageView; label: string; href: string }> = [
    { id: "passport", label: "My Passport", href: passportHref() },
    { id: "verify", label: "Verify", href: verifyHref(verifyMode ?? undefined) },
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
