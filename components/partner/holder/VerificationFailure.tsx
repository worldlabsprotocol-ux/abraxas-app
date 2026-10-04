"use client";
// FILE: components/partner/holder/VerificationFailure.tsx
// Failure states — what happened, was anything shared, what next.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import type { HolderRecoveryView } from "@/lib/partner/holderExperience";
import { HOLDER_PASSPORT_HREF } from "@/lib/partner/holderExperience";
import { holderBody, holderTitle, holderSection, HOLDER_FONT } from "./styles";

export interface VerificationFailureProps {
  recovery: HolderRecoveryView;
  onPrimary?: () => void;
  secondaryPassport?: boolean;
  technicalDetail?: string | null;
}

export function VerificationFailure({
  recovery,
  onPrimary,
  secondaryPassport = true,
  technicalDetail,
}: VerificationFailureProps) {
  const showNothingShared = recovery.state === "denied"
    || recovery.state === "invalid_binding"
    || recovery.state === "expired"
    || recovery.state === "missing"
    || recovery.state === "cancelled";

  return (
    <section
      role="alert"
      aria-live="assertive"
      className="abx-verification-failure"
      style={{
        ...holderSection,
        borderColor: "rgba(239,68,68,0.25)",
        background: "rgba(239,68,68,0.05)",
      }}
    >
      <h2 style={{ ...holderTitle, fontSize: "0.98rem" }}>{recovery.title}</h2>
      <p style={{ ...holderBody, marginTop: "0.4rem" }}>{recovery.explanation}</p>
      {showNothingShared ? (
        <p style={{ ...holderBody, marginTop: "0.45rem", fontWeight: 600, color: "var(--text-primary)" }}>
          Nothing was shared.
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginTop: "0.85rem",
          alignItems: "center",
        }}
      >
        {onPrimary ? (
          <Btn size="sm" onClick={onPrimary}>{recovery.next_label}</Btn>
        ) : recovery.href ? (
          <Btn href={recovery.href} size="sm">{recovery.next_label}</Btn>
        ) : null}
        {secondaryPassport ? (
          <Link
            href={HOLDER_PASSPORT_HREF}
            style={{
              fontFamily: HOLDER_FONT,
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              textDecoration: "underline",
              padding: "0.5rem 0.25rem",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Return to Passport
          </Link>
        ) : null}
      </div>

      {technicalDetail ? (
        <details style={{ marginTop: "0.75rem" }}>
          <summary
            style={{
              fontFamily: HOLDER_FONT,
              fontSize: "0.74rem",
              fontWeight: 700,
              color: "var(--accent)",
              cursor: "pointer",
            }}
          >
            View details
          </summary>
          <p style={{ ...holderBody, marginTop: "0.45rem", fontSize: "0.72rem" }}>{technicalDetail}</p>
        </details>
      ) : null}
    </section>
  );
}
