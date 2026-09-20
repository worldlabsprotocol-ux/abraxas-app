"use client";
// FILE: components/passport/PassportVerificationActivity.tsx
// Holder-private verification activity. Session cookie only — no subject query params.

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import {
  PASSPORT_ACTIVITY_EMPTY,
  PASSPORT_ACTIVITY_NOTICE,
  PASSPORT_ACTIVITY_UNAVAILABLE,
  type PassportActivityItem,
  type PassportActivityView,
} from "@/lib/passport/verificationActivity/contract";

const FONT = ABRAXAS_FONT_SANS;

const STATE_INK: Record<string, string> = {
  approved: "#5EEAD4",
  sandbox_only: "#818CF8",
  expired: "#FBBF24",
  revoked: "#F59E0B",
  denied: "#F87171",
};

async function fetchActivity(): Promise<PassportActivityView & { ok?: boolean; error?: string }> {
  const res = await fetch("/api/passport/verification-activity", { credentials: "include" });
  const body = await res.json().catch(() => ({})) as PassportActivityView & { ok?: boolean; error?: string };
  if (res.status === 401) {
    throw new Error("signin");
  }
  if (!res.ok) {
    throw new Error("unavailable");
  }
  return body;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ActivityCard({ item }: { item: PassportActivityItem }) {
  const ink = STATE_INK[item.state] ?? "var(--text-secondary)";
  return (
    <article
      aria-labelledby={`activity-${item.activity_ref}-heading`}
      style={{
        padding: "0.75rem 0.8rem",
        borderRadius: 12,
        marginBottom: "0.65rem",
        background: "rgba(8,10,18,0.55)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflowWrap: "anywhere",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.75rem", alignItems: "baseline" }}>
        <h3
          id={`activity-${item.activity_ref}-heading`}
          style={{
            fontFamily: FONT, fontSize: "0.86rem", fontWeight: 800, margin: 0, color: "var(--text-primary)",
          }}
        >
          {item.partner_label}
        </h3>
        <p
          role="status"
          aria-label={`Result status: ${item.state_label}${item.current ? ", current" : ", not current"}`}
          style={{
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, margin: 0, color: ink, letterSpacing: "0.02em",
          }}
        >
          {item.state_label}{item.current ? " · Current" : " · Not current"}
        </p>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
        {item.policy_label} · {item.version_summary}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
        {formatWhen(item.decided_at)}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-primary)", margin: "0.45rem 0 0", fontWeight: 650 }}>
        Shared result: {item.shared_result_category}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
        Why requested: {item.purpose}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.55 }}>
        What the partner received: {item.partner_received}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.55 }}>
        What was withheld: {item.withheld.join(", ")}.
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.55 }}>
        {item.evidence_not_shared}
      </p>
      {item.sandbox_only && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#A5B4FC", margin: "0.25rem 0 0", lineHeight: 1.55 }}>
          Sandbox-only. This result is not usable in Production.
        </p>
      )}
      {item.recovery && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
          {item.recovery}
        </p>
      )}
      {item.partner_entry_href && (
        <p style={{ margin: "0.45rem 0 0" }}>
          <a
            href={item.partner_entry_href}
            style={{ fontFamily: FONT, fontSize: "0.76rem", color: "#5EEAD4", fontWeight: 650 }}
          >
            Partner entry point
          </a>
        </p>
      )}
    </article>
  );
}

export function PassportVerificationActivity() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["passport", "verification-activity"],
    queryFn: fetchActivity,
    staleTime: 30_000,
    retry: false,
  });

  const signedOut = error instanceof Error && error.message === "signin";

  return (
    <section
      aria-labelledby="passport-verification-activity-heading"
      style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: PUBLIC_SURFACE.cardBorder,
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}
    >
      <h2
        id="passport-verification-activity-heading"
        style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}
      >
        Your verification activity
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.85rem" }}>
        {data?.notice ?? PASSPORT_ACTIVITY_NOTICE}
      </p>

      {isLoading && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
          Loading verification activity…
        </p>
      )}

      {signedOut && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Sign in to see your verification activity.
        </p>
      )}

      {isError && !signedOut && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          {PASSPORT_ACTIVITY_UNAVAILABLE}
        </p>
      )}

      {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          {PASSPORT_ACTIVITY_EMPTY}
        </p>
      )}

      {!isLoading && !isError && (data?.items ?? []).map((item) => (
        <ActivityCard key={item.activity_ref} item={item} />
      ))}

      {data?.truncated && (
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: "0.35rem 0 0" }}>
          Showing the most recent results in the last 180 days.
        </p>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0.75rem 0 0" }}>
        <Link href={data?.passport_href ?? "/passport"} style={{ color: "#5EEAD4", fontWeight: 650, textDecoration: "none" }}>
          Passport
        </Link>
        {" · "}
        <Link href={data?.explanation_href ?? "/docs/why-verification"} style={{ color: "#5EEAD4", fontWeight: 650, textDecoration: "none" }}>
          Why verification
        </Link>
      </p>
    </section>
  );
}
