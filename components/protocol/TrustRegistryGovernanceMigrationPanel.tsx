"use client";

import type { GovernanceMigrationUiState } from "@/lib/solana/trustRegistry/governance/decodeTrustRegistry";
import { squadsVaultAcceptCompatibilityReview } from "@/lib/solana/trustRegistry/governance/squadsVault";

const LABELS: Record<GovernanceMigrationUiState, { title: string; detail: string; tone: "neutral" | "warn" | "ok" | "blocked" }> = {
  deployed_authority_active: {
    title: "Deployed authority (on-chain)",
    detail: "Current governance authority from devnet registry evidence (#535). Institutional migration not active until extended layout + accept.",
    tone: "neutral",
  },
  layout_legacy_ops_safe: {
    title: "Legacy layout — policy/commitment ops safe",
    detail: "Build #536 program keeps v535-sized registry operable without extend (interruption-safe). Governance transfer requires extend first.",
    tone: "ok",
  },
  layout_extended_ready: {
    title: "Extended layout — migration ready",
    detail: "Registry account supports nomination/accept. No pending nomination.",
    tone: "neutral",
  },
  nomination_pending: {
    title: "Pending governance nomination",
    detail: "A successor authority must accept before migration finalizes. Not operational until accept executes.",
    tone: "warn",
  },
  nomination_expired_blocked: {
    title: "Nomination expired (blocked accept)",
    detail: "Pending nomination TTL elapsed. Permissionless expire or re-nominate required.",
    tone: "blocked",
  },
  migration_finalized: {
    title: "Migration finalized (on-chain)",
    detail: "Governance transfer sequence advanced. Verify authority via independent RPC + evidence packet.",
    tone: "ok",
  },
  blocked_unverified_destination: {
    title: "Blocked — unverified multisig destination",
    detail: "Nomination preflight rejects destinations outside the verified allowlist.",
    tone: "blocked",
  },
};

type Props = {
  /** Optional live decode; when absent, panel shows deployed #535 posture only (no simulated controls). */
  uiState?: GovernanceMigrationUiState;
};

export function TrustRegistryGovernanceMigrationPanel({ uiState = "deployed_authority_active" }: Props) {
  const copy = LABELS[uiState];
  const squads = squadsVaultAcceptCompatibilityReview();

  return (
    <section
      aria-labelledby="trust-registry-governance-migration"
      style={{
        border: "1px solid var(--border-subtle, #2a2a2a)",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        background: "var(--surface-raised, rgba(255,255,255,0.02))",
        maxWidth: 720,
      }}
    >
      <h2 id="trust-registry-governance-migration" style={{ fontSize: "1.05rem", marginBottom: "0.35rem" }}>
        Trust Registry — governance migration (#536)
      </h2>
      <p style={{ margin: 0, opacity: 0.85, fontSize: "0.92rem" }}>
        Read-only status. No wallet actions are triggered from this panel.
      </p>
      <div style={{ marginTop: "0.85rem", padding: "0.65rem 0.75rem", borderRadius: 8, border: "1px solid #333" }}>
        <strong>{copy.title}</strong>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", lineHeight: 1.45 }}>{copy.detail}</p>
      </div>
      <ul style={{ marginTop: "0.75rem", paddingLeft: "1.1rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
        {squads.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", opacity: 0.7 }}>
        Historical #535 revocation evidence is unchanged. Program ID and registry PDA are fixed for Path 3a.
      </p>
    </section>
  );
}
