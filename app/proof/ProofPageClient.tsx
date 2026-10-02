"use client";
// FILE: app/proof/ProofPageClient.tsx

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { GtmDiscoveryForm } from "@/components/gtm/GtmDiscoveryForm";
import { GtmProofPackContent } from "@/components/gtm/GtmProofPackContent";
import type { GtmDiscoveryAnswers } from "@/lib/gtm/contract";
import {
  discoveryAnswersFromSearchParams,
  loadDiscoveryFromSessionStorage,
  saveDiscoveryToSessionStorage,
} from "@/lib/gtm/discovery";

export function ProofPageClient() {
  const searchParams = useSearchParams();
  const [discovery, setDiscovery] = useState<GtmDiscoveryAnswers | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fromQuery = discoveryAnswersFromSearchParams(new URLSearchParams(searchParams.toString()));
    const fromSession = loadDiscoveryFromSessionStorage();
    const resolved = fromQuery ?? fromSession;
    if (resolved) {
      setDiscovery(resolved);
      setShowForm(false);
      if (fromQuery) saveDiscoveryToSessionStorage(resolved);
    }
    setHydrated(true);
  }, [searchParams]);

  if (!hydrated) return null;

  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Proof"
        title="See reuse across two applications"
        subtitle="Answer four short questions so Abraxas can show the most relevant reference proof. No email required. No identity data collected."
      />

      {showForm ? (
        <GtmDiscoveryForm
          initialAnswers={discovery}
          onComplete={(answers) => {
            setDiscovery(answers);
            setShowForm(false);
          }}
        />
      ) : (
        <GtmProofPackContent
          discovery={discovery}
          onRestartDiscovery={() => setShowForm(true)}
        />
      )}
    </RedesignPage>
  );
}
