"use client";
// FILE: components/passport/PassportVerificationActivity.tsx
// Holder-private verification activity. Session cookie only — no subject query params.

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import {
  PASSPORT_ACTIVITY_EMPTY,
  PASSPORT_ACTIVITY_NOTICE,
  PASSPORT_ACTIVITY_UNAVAILABLE,
  PASSPORT_ACTIVITY_WITHDRAW_CONFIRM_POINTS,
  PASSPORT_ACTIVITY_WITHDRAW_CONFIRM_TITLE,
  PASSPORT_ACTIVITY_WITHDRAW_LABEL,
  PASSPORT_ACTIVITY_WITHDRAW_SUCCESS,
  PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE,
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

function WithdrawConfirmDialog({
  open,
  busy,
  error,
  partnerLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  partnerLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,6,12,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 40,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={{
          width: "min(32rem, 100%)",
          background: "#10141f",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          padding: "1rem 1.05rem",
        }}
      >
        <h3 id={titleId} style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: 0 }}>
          {PASSPORT_ACTIVITY_WITHDRAW_CONFIRM_TITLE}
        </h3>
        <div id={bodyId}>
          <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0.55rem 0 0" }}>
            Withdraw the shared result for {partnerLabel}.
          </p>
          <ul style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-primary)", lineHeight: 1.55, margin: "0.55rem 0 0", paddingLeft: "1.1rem" }}>
            {PASSPORT_ACTIVITY_WITHDRAW_CONFIRM_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        {error && (
          <p role="alert" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#FCA5A5", margin: "0.65rem 0 0", lineHeight: 1.5 }}>
            {error}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.9rem" }}>
          <button
            type="button"
            ref={cancelRef}
            disabled={busy}
            onClick={onCancel}
            style={{
              fontFamily: FONT, fontSize: "0.8rem", fontWeight: 650, padding: "0.45rem 0.75rem",
              borderRadius: 8, border: "1px solid rgba(255,255,255,0.16)", background: "transparent", color: "var(--text-primary)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{
              fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, padding: "0.45rem 0.75rem",
              borderRadius: 8, border: "1px solid rgba(245,158,11,0.55)", background: "rgba(245,158,11,0.16)", color: "#FBBF24",
            }}
          >
            {busy ? "Withdrawing…" : PASSPORT_ACTIVITY_WITHDRAW_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({
  item,
  onRequestWithdraw,
}: {
  item: PassportActivityItem;
  onRequestWithdraw: (item: PassportActivityItem) => void;
}) {
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
      {item.reuse_consent_notice && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.55 }}>
          {item.reuse_consent_notice}
        </p>
      )}
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
      {item.current && (
        <p style={{ margin: "0.55rem 0 0" }}>
          <button
            type="button"
            onClick={() => onRequestWithdraw(item)}
            style={{
              fontFamily: FONT,
              fontSize: "0.76rem",
              fontWeight: 700,
              color: "#FBBF24",
              background: "transparent",
              border: "1px solid rgba(251,191,36,0.4)",
              borderRadius: 8,
              padding: "0.35rem 0.6rem",
            }}
          >
            {PASSPORT_ACTIVITY_WITHDRAW_LABEL}
          </button>
        </p>
      )}
    </article>
  );
}

export function PassportVerificationActivity() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PassportActivityItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["passport", "verification-activity"],
    queryFn: fetchActivity,
    staleTime: 30_000,
    retry: false,
  });

  const withdraw = useMutation({
    mutationFn: async (activityRef: string) => {
      const res = await fetch("/api/passport/verification-activity/withdraw", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activity_ref: activityRef }),
      });
      const body = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; next_step?: string; state_label?: string };
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE);
      }
      return body;
    },
    onSuccess: async (body) => {
      setPending(null);
      setNotice(typeof body.next_step === "string" ? body.next_step : PASSPORT_ACTIVITY_WITHDRAW_SUCCESS);
      await queryClient.invalidateQueries({ queryKey: ["passport", "verification-activity"] });
    },
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

      {notice && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#FBBF24", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
          {notice}
        </p>
      )}

      {!isLoading && !isError && (data?.items ?? []).map((item) => (
        <ActivityCard
          key={item.activity_ref}
          item={item}
          onRequestWithdraw={(next) => {
            setNotice(null);
            withdraw.reset();
            setPending(next);
          }}
        />
      ))}

      <WithdrawConfirmDialog
        open={Boolean(pending)}
        busy={withdraw.isPending}
        error={withdraw.isError ? (withdraw.error instanceof Error ? withdraw.error.message : PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE) : null}
        partnerLabel={pending?.partner_label ?? "this partner"}
        onCancel={() => {
          if (!withdraw.isPending) setPending(null);
        }}
        onConfirm={() => {
          if (pending) void withdraw.mutateAsync(pending.activity_ref);
        }}
      />

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
