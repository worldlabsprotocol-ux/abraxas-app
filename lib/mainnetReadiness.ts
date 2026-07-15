// FILE: lib/mainnetReadiness.ts
// Boolean gates for "100% capacity mainnet" — internal + public checklist. No calendar dates.

import { CONFIDENT_STATUS_FRAMING } from "./currentStatus";
import { MAINNET_FOUNDER_PITCH } from "./positioningStrategy";

export interface MainnetMilestone {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
}

/** Seven gates before open, self-serve, audit-complete mainnet at full capacity. */
export const MAINNET_READINESS_MILESTONES: MainnetMilestone[] = [
  {
    id: "core-verification-live",
    label: "Core verification live in production",
    description:
      "Passport issuance, W3C Verifiable Credentials, Veriff IDV, consent, and POST /api/credentials/verify — real users and pilot partners.",
    done: true,
    href: "/passport",
  },
  {
    id: "passport-mainnet-audit",
    label: "Sui Passport mainnet audit published",
    description:
      "Third-party review of the Move Passport module and deployment path before external CPI integrations.",
    done: false,
    href: "/security",
  },
  {
    id: "passport-mainnet-deploy",
    label: "Sui Passport deployed on mainnet",
    description:
      "Move Passport stamps and on-chain verification state on Sui mainnet — not devnet-only anchors.",
    done: false,
    href: "/docs/sui",
  },
  {
    id: "credential-api-review",
    label: "Credential API formal security review published",
    description:
      "Independent review of issuance, verify, and revocation paths that relying parties depend on.",
    done: false,
    href: "/security",
  },
  {
    id: "unaffiliated-rp",
    label: "First unaffiliated relying party production check",
    description:
      "An outside organization — not Abraxas or an affiliated operator — clears a real transaction using Abraxas credentials.",
    done: false,
    href: "/integrations/relying-parties",
  },
  {
    id: "asset-monitoring-v1",
    label: "Asset monitoring v1 (state-change → refresh or revoke)",
    description:
      "Automated signal when a record materially changes (sale, lien, listing drift) — credentials fail closed or trigger refresh.",
    done: false,
    href: "/trust-framework#trust-over-time",
  },
  {
    id: "open-integration-bounty",
    label: "Self-serve integrate + public bug bounty live",
    description:
      "Partners onboard without manual design-partner gate; responsible disclosure program pays rewards post-audit.",
    done: false,
    href: "/integrate",
  },
];

export const MAINNET_READINESS_HEADLINE = "What full mainnet means";

export const MAINNET_READINESS_SUMMARY = CONFIDENT_STATUS_FRAMING;

export const MAINNET_CURRENT_STAGE = {
  label: "Where we are",
  stage: "Pilot production — real assets live",
  body: MAINNET_FOUNDER_PITCH,
} as const;

export function mainnetReadinessProgress(): {
  done: number;
  total: number;
  percent: number;
  isFullyReady: boolean;
} {
  const total = MAINNET_READINESS_MILESTONES.length;
  const done = MAINNET_READINESS_MILESTONES.filter(m => m.done).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    isFullyReady: done === total,
  };
}
