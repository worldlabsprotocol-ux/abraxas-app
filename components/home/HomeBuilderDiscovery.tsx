"use client";
// FILE: components/home/HomeBuilderDiscovery.tsx

import { useEffect, useMemo, useState } from "react";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { Btn } from "@/components/redesign/ui";
import { listStudioPackSummaries } from "@/lib/partner/integrationStudio";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import { isPolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import {
  HOME_BUILDER_PLATFORMS,
  clearHomeBuilderDiscoveryDraft,
  readHomeBuilderDiscoveryDraft,
  type HomeBuilderDiscoveryDraft,
  writeHomeBuilderDiscoveryDraft,
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

  const [draft, setDraft] = useState<HomeBuilderDiscoveryDraft>({ step: "platform", platform: null, policyPackId: null });

  useEffect(() => {
    const saved = readHomeBuilderDiscoveryDraft();
    if (saved) setDraft(saved);
  }, []);

  const updateDraft = (next: HomeBuilderDiscoveryDraft) => {
    setDraft(next);
    writeHomeBuilderDiscoveryDraft(next);
  };

  const { step, platform, policyPackId: packId } = draft;

  if (step === "platform") {
    return (
      <BuilderActiveTask
        taskKey="choose-platform"
        testId="home-builder-discovery"
        title="What are you building?"
        description="Choose where Abraxas would fit."
        action={<Btn size="sm" disabled={!platform} onClick={() => updateDraft({ ...draft, step: "pack" })}>Continue</Btn>}
      >
        <div className="abx-home-builder-discovery__platform-grid" role="radiogroup" aria-label="Integration type">
          {HOME_BUILDER_PLATFORMS.map((option) => (
            <button key={option.id} type="button" role="radio" aria-checked={platform === option.id}
              className={platform === option.id
                ? "abx-home-builder-discovery__platform abx-home-builder-discovery__platform--selected"
                : "abx-home-builder-discovery__platform"}
              onClick={() => updateDraft({ ...draft, platform: option.id })}>
              <span className="abx-home-builder-discovery__platform-label">{option.label}</span>
              <span className="abx-home-builder-discovery__platform-detail">{option.detail}</span>
            </button>
          ))}
        </div>
      </BuilderActiveTask>
    );
  }

  return (
    <BuilderActiveTask
      taskKey="choose-policy"
      testId="home-builder-discovery"
      title="What should Abraxas verify?"
      description="Choose a policy for your test app."
      action={<Btn size="sm" disabled={!packId} onClick={() => {
        if (!platform || !packId) return;
        writeHomeBuilderDiscoveryIntent({ platform, policyPackId: packId });
        clearHomeBuilderDiscoveryDraft();
        onComplete();
      }}>Continue to builder</Btn>}
      advanced={<button type="button" className="abx-builder-inline-link" onClick={() => updateDraft({ ...draft, step: "platform" })}>Change platform</button>}
    >
      <div className="abx-home-builder-discovery__pack-grid" role="radiogroup" aria-label="Verification objective">
        {packs.map((pack) => {
          const id = pack.pack_id;
          if (!isPolicyPackId(id)) return null;
          return (
            <button key={id} type="button" role="radio" aria-checked={packId === id}
              className={packId === id
                ? "abx-home-builder-discovery__pack abx-home-builder-discovery__pack--selected"
                : "abx-home-builder-discovery__pack"}
              onClick={() => updateDraft({ ...draft, policyPackId: id })}>
              {pack.display_name}
            </button>
          );
        })}
      </div>
    </BuilderActiveTask>
  );
}
