"use client";
// FILE: components/home/HomeBuilderDiscovery.tsx
// Integration-first discovery on the homepage builder (no wallet required).

import { useMemo, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { listStudioPackSummaries } from "@/lib/partner/integrationStudio";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import { isPolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import {
  HOME_BUILDER_PLATFORMS,
  type HomeBuilderPlatformId,
  writeHomeBuilderDiscoveryIntent,
} from "@/lib/home/homeBuilderDiscovery";

const BEGINNER_PACK_ORDER: PolicyPackId[] = [
  "age_18_retail",
  "age_21_retail",
  "residency_us",
  "wallet_control",
  "membership_credential",
];

export function HomeBuilderDiscovery({ onComplete }: { onComplete: () => void }) {
  const packs = useMemo(() => {
    const summaries = listStudioPackSummaries();
    const byId = new Map(summaries.map((row) => [row.pack_id, row]));
    return BEGINNER_PACK_ORDER.map((id) => byId.get(id)).filter(Boolean) as typeof summaries;
  }, []);

  const [platform, setPlatform] = useState<HomeBuilderPlatformId | null>(null);
  const [packId, setPackId] = useState<PolicyPackId | null>(null);

  const canContinue = Boolean(platform && packId);

  return (
    <div className="abx-home-builder-discovery" data-testid="home-builder-discovery">
      <p className="abx-home-builder-discovery__kicker">First screen</p>
      <h3 className="abx-home-builder-discovery__title">What are you building?</h3>
      <p className="abx-home-builder-discovery__lead">
        Choose where Abraxas would fit. You can explore policies before connecting a wallet.
      </p>
      <div className="abx-home-builder-discovery__platform-grid" role="radiogroup" aria-label="Integration type">
        {HOME_BUILDER_PLATFORMS.map((option) => {
          const selected = platform === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={
                selected
                  ? "abx-home-builder-discovery__platform abx-home-builder-discovery__platform--selected"
                  : "abx-home-builder-discovery__platform"
              }
              onClick={() => setPlatform(option.id)}
            >
              <span className="abx-home-builder-discovery__platform-label">{option.label}</span>
              <span className="abx-home-builder-discovery__platform-detail">{option.detail}</span>
            </button>
          );
        })}
      </div>

      <h3 className="abx-home-builder-discovery__title abx-home-builder-discovery__title--second">
        What should Abraxas verify?
      </h3>
      <p className="abx-home-builder-discovery__lead">
        These are the same Launchpad policy packs. Identity or liveness is never the default path.
      </p>
      <div className="abx-home-builder-discovery__pack-grid" role="radiogroup" aria-label="Verification objective">
        {packs.map((pack) => {
          const id = pack.pack_id;
          if (!isPolicyPackId(id)) return null;
          const selected = packId === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={
                selected
                  ? "abx-home-builder-discovery__pack abx-home-builder-discovery__pack--selected"
                  : "abx-home-builder-discovery__pack"
              }
              onClick={() => setPackId(id)}
            >
              {pack.display_name}
            </button>
          );
        })}
      </div>

      <div className="abx-home-builder-discovery__actions">
        <Btn
          size="sm"
          disabled={!canContinue}
          onClick={() => {
            if (!platform || !packId) return;
            writeHomeBuilderDiscoveryIntent({ platform, policyPackId: packId });
            onComplete();
          }}
        >
          Continue to authorize when needed
        </Btn>
        <p className="abx-home-builder-discovery__hint">
          Wallet connection happens only when your selected check requires it.
        </p>
      </div>
    </div>
  );
}
