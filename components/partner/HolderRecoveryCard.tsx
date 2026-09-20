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
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        marginBottom: "0.85rem",
        padding: "0.9rem 1rem",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        maxWidth: "100%",
      }}
    >
      <h2 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem", fontWeight: 800 }}>{recovery.title}</h2>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
        {recovery.explanation}
      </p>
      {onPrimary ? (
        <Btn size="sm" onClick={onPrimary}>{recovery.next_label}</Btn>
      ) : recovery.href ? (
        <Btn href={recovery.href} size="sm">{recovery.next_label}</Btn>
      ) : (
        <Link href="/passport" style={{ color: "var(--accent)", fontWeight: 700 }}>
          {recovery.next_action === "return_to_passport" ? recovery.next_label : "Return to Passport"}
        </Link>
      )}
    </div>
  );
}
