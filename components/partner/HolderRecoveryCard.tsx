"use client";
// FILE: components/partner/HolderRecoveryCard.tsx
// Recoverable holder states with a single safe next action.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import type { HolderRecoveryView } from "@/lib/partner/holderExperience";

export function HolderRecoveryCard({
  recovery,
  onPrimary,
}: {
  recovery: HolderRecoveryView;
  onPrimary?: () => void;
}) {
  const signInEmphasis = recovery.next_action === "sign_in_again";

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        marginBottom: "0.85rem",
        padding: signInEmphasis ? "1rem 1.1rem" : "0.9rem 1rem",
        borderRadius: 12,
        border: signInEmphasis
          ? "1px solid rgba(76, 187, 146, 0.38)"
          : "1px solid rgba(255,255,255,0.14)",
        background: signInEmphasis ? "rgba(76, 187, 146, 0.07)" : undefined,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        maxWidth: "100%",
      }}
    >
      <h2 style={{ margin: "0 0 0.4rem", fontSize: signInEmphasis ? "1rem" : "0.95rem", fontWeight: 800 }}>
        {recovery.title}
      </h2>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
        {recovery.explanation}
      </p>
      {onPrimary ? (
        <Btn onClick={onPrimary}>{recovery.next_label}</Btn>
      ) : recovery.href ? (
        <Btn href={recovery.href}>{recovery.next_label}</Btn>
      ) : (
        <Link href="/passport" style={{ color: "var(--accent)", fontWeight: 700 }}>
          {recovery.next_action === "return_to_passport" ? recovery.next_label : "Return to Passport"}
        </Link>
      )}
      {recovery.footnotes?.length ? (
        <ul
          style={{
            margin: "0.85rem 0 0",
            paddingLeft: "1.1rem",
            fontSize: "0.74rem",
            lineHeight: 1.55,
            color: "var(--text-muted)",
          }}
        >
          {recovery.footnotes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
