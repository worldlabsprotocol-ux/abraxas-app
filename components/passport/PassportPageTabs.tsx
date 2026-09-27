"use client";
// FILE: components/passport/PassportPageTabs.tsx
// Top-level switch between Passport, holder verification, and privacy controls.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buildPassportSetupHref } from "@/lib/passport/passportVerifyAccess";
import {
  PASSPORT_ACTIVITY_HREF,
  PASSPORT_PRIVACY_HREF,
  PASSPORT_SUPPORT_HREF,
  type PassportPageView,
} from "@/lib/passport/passportPrivacyNavigation";
import {
  HOLDER_VERIFY_DEFAULT_PATH,
  PARTNER_RECEIPT_VERIFIER_PATH,
} from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

function holderVerifyMode(mode: string | null): string {
  if (mode === "credential" || mode === "policy") return "credential";
  return "registry";
}

function buildHolderVerifyTabHref(searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  const verify = searchParams.get("verify_request")?.trim() ?? "";
  if (verify) params.set("verify_request", verify);
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

  const verifyLabel = onVerifyRoute ? "Partner verifier" : "My records";

  const tabs: Array<{ id: PassportPageView; label: string; href: string }> = [
    { id: "passport", label: "My Passport", href: passportHref },
    { id: "activity", label: "Activity", href: PASSPORT_ACTIVITY_HREF },
    { id: "verify", label: verifyLabel, href: verifyHref },
    { id: "privacy", label: "Privacy & controls", href: PASSPORT_PRIVACY_HREF },
    { id: "support", label: "Help & safety", href: PASSPORT_SUPPORT_HREF },
  ];

  return (
    <nav aria-label="Passport sections" style={{
      display: "flex", gap: "0.35rem", flexWrap: "wrap",
      padding: "0.25rem", borderRadius: 999, marginBottom: "1.25rem",
      background: "var(--surface-inset)", border: "1px solid var(--border)",
    }}>
      {tabs.map(tab => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? "page" : undefined}
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
    </nav>
  );
}
