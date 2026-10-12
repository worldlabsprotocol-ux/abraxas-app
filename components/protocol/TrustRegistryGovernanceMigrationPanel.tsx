"use client";

import { useEffect, useState } from "react";
import type { GovernanceMigrationUiState } from "@/lib/solana/trustRegistry/governance/decodeTrustRegistry";
import { squadsVaultAcceptCompatibilityReview } from "@/lib/solana/trustRegistry/governance/squadsVault";
import type { SquadsProposalLifecycleState } from "@/lib/solana/trustRegistry/governance/squadsProposalHarness";
import { squadsProposalStateIsSimulated } from "@/lib/solana/trustRegistry/governance/squadsProposalHarness";
import {
  TRUST_REGISTRY_DEVNET_GOVERNANCE_AUTHORITY,
  TRUST_REGISTRY_DEVNET_LIVE_V535,
  TRUST_REGISTRY_DEVNET_UPGRADE_AUTHORITY,
} from "@/lib/solana/trustRegistry/governance/trustRegistryDevnetLiveEvidence535";

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

const PROPOSAL_LABELS: Record<
  SquadsProposalLifecycleState,
  { title: string; detail: string }
> = {
  PROPOSED: {
    title: "Multisig proposal — proposed",
    detail: "Off-chain or Squads proposal created. Not executable until threshold approvals.",
  },
  APPROVED: {
    title: "Multisig proposal — partially approved",
    detail: "Some members approved; threshold not met. No on-chain accept yet.",
  },
  EXECUTABLE: {
    title: "Multisig proposal — executable",
    detail: "Threshold met. Awaits Squads vaultTransactionExecute (real signature required).",
  },
  EXECUTED: {
    title: "Multisig proposal — executed",
    detail: "On-chain transaction recorded. Verify independently before treating as finalized.",
  },
  FINALIZED: {
    title: "Multisig proposal — finalized",
    detail: "Independent verification complete. Governance migration may be operationally complete.",
  },
  REJECTED: {
    title: "Multisig proposal — rejected",
    detail: "Proposal rejected or aborted. Do not treat as live governance execution.",
  },
};

type Props = {
  /** Optional live decode; when absent, panel shows deployed #535 posture only (no simulated controls). */
  uiState?: GovernanceMigrationUiState;
  /** Optional Squads lifecycle — never inferred as live execution unless EXECUTED/FINALIZED with evidence. */
  squadsProposalState?: SquadsProposalLifecycleState;
};

type CustodyStatusPayload = {
  gate?: { stage?: string; blockers?: string[]; authority_domains?: Record<string, { configuredVaultPda?: string | null; threshold?: number | null; memberCount?: number | null }> };
  custody?: {
    envConfigured?: boolean;
    preflight?: { ok?: boolean; blockers?: string[] };
    protocolUpgradeMultisig?: { multisigPda?: string; derivedVaultPda?: string; threshold?: number | null; memberCount?: number | null } | null;
    registryAdministrationMultisig?: { multisigPda?: string; derivedVaultPda?: string; threshold?: number | null; memberCount?: number | null } | null;
  };
  liveControlsEnabled?: boolean;
};

export function TrustRegistryGovernanceMigrationPanel({
  uiState = "deployed_authority_active",
  squadsProposalState,
}: Props) {
  const copy = LABELS[uiState];
  const squads = squadsVaultAcceptCompatibilityReview();
  const proposalCopy = squadsProposalState ? PROPOSAL_LABELS[squadsProposalState] : null;
  const proposalSimulated =
    squadsProposalState != null && squadsProposalStateIsSimulated(squadsProposalState);

  const [custodyStatus, setCustodyStatus] = useState<CustodyStatusPayload | null>(null);
  const [custodyLoadError, setCustodyLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/trust/registry/custody-status")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CustodyStatusPayload>;
      })
      .then((data) => {
        if (!cancelled) setCustodyStatus(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setCustodyLoadError(e instanceof Error ? e.message : "fetch_failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        Read-only status. No wallet actions are triggered from this panel. Institutional Squads custody is not activated until founder-authorized multisig provisioning.
      </p>
      <div
        style={{
          marginTop: "0.75rem",
          padding: "0.65rem 0.75rem",
          borderRadius: 8,
          border: "1px solid #333",
          fontSize: "0.82rem",
          lineHeight: 1.55,
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
        }}
      >
        <div>
          <strong>Live devnet (#535 evidence)</strong> — program{" "}
          <code>{TRUST_REGISTRY_DEVNET_LIVE_V535.program_id}</code>
        </div>
        <div>Upgrade authority (today): <code>{TRUST_REGISTRY_DEVNET_UPGRADE_AUTHORITY}</code></div>
        <div>Registry governance authority (today): <code>{TRUST_REGISTRY_DEVNET_GOVERNANCE_AUTHORITY}</code></div>
        <div>Registry PDA: <code>{TRUST_REGISTRY_DEVNET_LIVE_V535.registry_pda}</code></div>
        <div>
          Historical commitment: <code>{TRUST_REGISTRY_DEVNET_LIVE_V535.commitment_state_pda}</code> —{" "}
          {TRUST_REGISTRY_DEVNET_LIVE_V535.enforcement.revoked_on_chain ? "REVOKED (preserved)" : "unknown"}
        </div>
        <div style={{ marginTop: "0.35rem", opacity: 0.85 }}>
          Target steady state: separate Squads v4 vaults for protocol upgrades vs registry administration. Operational publish/revoke remains outside both multisigs until migrated.
        </div>
      </div>
      <div style={{ marginTop: "0.85rem", padding: "0.65rem 0.75rem", borderRadius: 8, border: "1px solid #333" }}>
        <strong>Institutional custody (#539)</strong>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", lineHeight: 1.45, opacity: 0.9 }}>
          Read-only devnet RPC verification. No simulated approvals or live Squads controls in this UI.
        </p>
        {custodyLoadError ? (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#c96" }}>
            Custody status unavailable: {custodyLoadError}
          </p>
        ) : null}
        {custodyStatus ? (
          <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", lineHeight: 1.55, fontFamily: "var(--font-mono, ui-monospace, monospace)" }}>
            <div>Activation stage: <code>{custodyStatus.gate?.stage ?? "unknown"}</code></div>
            <div>
              Protocol upgrade vault:{" "}
              <code>
                {custodyStatus.custody?.protocolUpgradeMultisig?.derivedVaultPda ??
                  custodyStatus.gate?.authority_domains?.protocol_upgrade?.configuredVaultPda ??
                  "not configured"}
              </code>
              {custodyStatus.custody?.protocolUpgradeMultisig?.threshold != null ? (
                <span>
                  {" "}
                  — {custodyStatus.custody.protocolUpgradeMultisig.threshold}-of-
                  {custodyStatus.custody.protocolUpgradeMultisig.memberCount ?? "?"} (on-chain)
                </span>
              ) : null}
            </div>
            <div>
              Registry admin vault:{" "}
              <code>
                {custodyStatus.custody?.registryAdministrationMultisig?.derivedVaultPda ??
                  custodyStatus.gate?.authority_domains?.registry_administration?.configuredVaultPda ??
                  "not configured"}
              </code>
              {custodyStatus.custody?.registryAdministrationMultisig?.threshold != null ? (
                <span>
                  {" "}
                  — {custodyStatus.custody.registryAdministrationMultisig.threshold}-of-
                  {custodyStatus.custody.registryAdministrationMultisig.memberCount ?? "?"} (on-chain)
                </span>
              ) : null}
            </div>
            {(custodyStatus.gate?.blockers?.length ?? 0) > 0 ? (
              <ul style={{ margin: "0.45rem 0 0", paddingLeft: "1.1rem" }}>
                {custodyStatus.gate!.blockers!.slice(0, 8).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: "0.45rem 0 0", opacity: 0.85 }}>No activation blockers reported by gate.</p>
            )}
          </div>
        ) : !custodyLoadError ? (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", opacity: 0.7 }}>Loading custody status…</p>
        ) : null}
      </div>
      <div style={{ marginTop: "0.85rem", padding: "0.65rem 0.75rem", borderRadius: 8, border: "1px solid #333" }}>
        <strong>{copy.title}</strong>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", lineHeight: 1.45 }}>{copy.detail}</p>
      </div>
      {proposalCopy ? (
        <div
          style={{
            marginTop: "0.65rem",
            padding: "0.65rem 0.75rem",
            borderRadius: 8,
            border: proposalSimulated ? "1px dashed #665" : "1px solid #3a5",
          }}
        >
          <strong>{proposalCopy.title}</strong>
          {proposalSimulated ? (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", opacity: 0.75 }}>
              Simulation / planning only — not live Squads execution.
            </p>
          ) : null}
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", lineHeight: 1.45 }}>{proposalCopy.detail}</p>
        </div>
      ) : null}
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
