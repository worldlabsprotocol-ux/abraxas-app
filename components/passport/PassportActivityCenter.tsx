"use client";
// FILE: components/passport/PassportActivityCenter.tsx
// One holder-facing history for verification use, privacy controls, and support.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProductOutcomeState } from "@/components/product/ProductOutcomeState";
import { PassportVerificationActivity } from "@/components/passport/PassportVerificationActivity";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import {
  buildPassportAccountActivity,
  type PassportAccountActivityItem,
} from "@/lib/passport/passportActivitySummary";
import type { PassportSupportHistoryItem } from "@/lib/passport/passportSupport";
import type { HolderPrivacyRequestView } from "@/lib/privacy/types";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

interface ActivitySources {
  items: PassportAccountActivityItem[];
  privacyAvailable: boolean;
  supportAvailable: boolean;
}

async function fetchActivitySources(): Promise<ActivitySources> {
  const [privacyResult, supportResult] = await Promise.allSettled([
    fetch("/api/passport/privacy/requests", { credentials: "include" }),
    fetch("/api/passport/support", { credentials: "include" }),
  ]);

  let privacyRequests: HolderPrivacyRequestView[] = [];
  let supportRequests: PassportSupportHistoryItem[] = [];
  let privacyAvailable = false;
  let supportAvailable = false;

  if (privacyResult.status === "fulfilled" && privacyResult.value.ok) {
    const body = await privacyResult.value.json() as { requests?: HolderPrivacyRequestView[] };
    privacyRequests = Array.isArray(body.requests) ? body.requests : [];
    privacyAvailable = true;
  }

  if (supportResult.status === "fulfilled" && supportResult.value.ok) {
    const body = await supportResult.value.json() as { requests?: PassportSupportHistoryItem[] };
    supportRequests = Array.isArray(body.requests) ? body.requests : [];
    supportAvailable = true;
  }

  return {
    items: buildPassportAccountActivity({ privacyRequests, supportRequests }),
    privacyAvailable,
    supportAvailable,
  };
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function AccountActivityCard({ item }: { item: PassportAccountActivityItem }) {
  return (
    <article style={{
      padding: "0.8rem",
      borderRadius: 12,
      background: "var(--surface)",
      border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start" }}>
        <div>
          <p style={{
            fontFamily: FONT,
            fontSize: "0.62rem",
            fontWeight: 800,
            color: item.kind === "privacy" ? "#A5B4FC" : ACCENT,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            margin: "0 0 0.3rem",
          }}>
            {item.kind === "privacy" ? "Privacy" : "Support"}
          </p>
          <h3 style={{ fontFamily: FONT, fontSize: "0.82rem", margin: 0 }}>
            {item.title}
          </h3>
        </div>
        <span style={{
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: 999,
          padding: "0.25rem 0.5rem",
          textAlign: "right",
        }}>
          {item.status}
        </span>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.45rem 0 0.55rem" }}>
        {formatWhen(item.occurred_at)}
      </p>
      <Link href={item.href} style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
        {item.action_label} →
      </Link>
    </article>
  );
}

export function PassportActivityCenter() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["passport", "account-activity"],
    queryFn: fetchActivitySources,
    staleTime: 30_000,
    retry: false,
  });

  const partiallyUnavailable = Boolean(data && (!data.privacyAvailable || !data.supportAvailable));

  return (
    <section style={{ marginBottom: "2rem" }}>
      <div style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: PUBLIC_SURFACE.cardBorder,
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}>
        <p style={{
          fontFamily: FONT,
          fontSize: "0.62rem",
          fontWeight: 800,
          color: ACCENT,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "0.35rem",
        }}>
          Account updates
        </p>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
          Privacy and support history
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: "0 0 0.9rem" }}>
          Track export, deletion, and support requests in plain language.
        </p>

        {isLoading && (
          <p role="status" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: 0 }}>
            Loading account activity…
          </p>
        )}

        {isError && (
          <ProductOutcomeState
            kind="error"
            title="Account updates could not be loaded"
            detail="Verification history below may still be available."
            actionLabel="Try again"
            onAction={() => void refetch()}
          />
        )}

        {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
          <p role="status" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
            No account updates yet. Privacy and support requests will appear here.
          </p>
        )}

        {(data?.items.length ?? 0) > 0 && (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {data?.items.map(item => <AccountActivityCard key={item.id} item={item} />)}
          </div>
        )}

        {partiallyUnavailable && (
          <p role="status" style={{ fontFamily: FONT, fontSize: "0.68rem", color: "#FBBF24", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
            Some account updates could not be loaded. Verification history below remains separate and current.
          </p>
        )}
      </div>

      <PassportVerificationActivity />
    </section>
  );
}
