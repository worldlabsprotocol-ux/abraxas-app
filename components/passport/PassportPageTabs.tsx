"use client";
// FILE: components/passport/PassportPageTabs.tsx
// Top-level switch between Passport setup and holder-facing verify tools.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buildPassportSetupHref } from "@/lib/passport/passportVerifyAccess";
import {
  HOLDER_VERIFY_DEFAULT_PATH,
  PARTNER_RECEIPT_VERIFIER_PATH,
} from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export type PassportPageView = "passport" | "verify";

function holderVerifyMode(mode: string | null): string {
  if (mode === "credential" || mode === "policy") return "credential";
  return "registry";
}

function buildHolderVerifyTabHref(searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  for (const key of ["verify_request", "policy_id", "partner_id", "return", "verification"] as const) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  params.set("view", "verify");
  params.set("mode", holderVerifyMode(searchParams.get("mode")));
  return `/passport?${params.toString()}`;
}

function buildPartnerVerifierTabHref(): string {
  return PARTNER_RECEIPT_VERIFIER_PATH;
}

export function PassportPageTabs({ active }: { active: PassportPageView }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onVerifyRoute = pathname?.startsWith("/verify");

  const passportHref = buildPassportSetupHref(searchParams);
  const verifyHref = onVerifyRoute
    ? buildPartnerVerifierTabHref()
    : buildHolderVerifyTabHref(searchParams);

  const verifyLabel = onVerifyRoute ? "Partner verifier" : "My records & credentials";

  const tabs: Array<{ id: PassportPageView; label: string; href: string }> = [
    { id: "passport", label: "My Passport", href: passportHref },
    { id: "verify", label: verifyLabel, href: verifyHref },
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
      {onVerifyRoute && (
        <Link
          href={HOLDER_VERIFY_DEFAULT_PATH}
          style={{
            marginLeft: "auto",
            alignSelf: "center",
            padding: "0.35rem 0.75rem",
            borderRadius: 999,
            textDecoration: "none",
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--accent)",
            border: "1px solid var(--border)",
            whiteSpace: "nowrap",
          }}
        >
          Holder tools
        </Link>
      )}
    </div>
  );
}
