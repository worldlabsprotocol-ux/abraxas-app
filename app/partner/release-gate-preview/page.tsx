// FILE: app/partner/release-gate-preview/page.tsx
// Preview-only holder state screenshots — uses production copy/components, not mock data.

import { notFound } from "next/navigation";
import { PartnerJourneyLayout } from "@/components/partner/PartnerJourneyLayout";
import {
  resolvePartnerHolderPresentation,
  type PartnerHolderState,
} from "@/lib/partner/partnerHolderCopy";
import { Btn } from "@/components/redesign/ui";

const PREVIEW_STATES: PartnerHolderState[] = [
  "under_review",
  "age_confirmed",
  "return_to_partner",
];

function isPreviewGateAllowed(): boolean {
  if (process.env.PARTNER_RELEASE_GATE_PREVIEW === "true") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return process.env.NODE_ENV === "development";
}

export default function PartnerReleaseGatePreviewPage() {
  if (!isPreviewGateAllowed()) {
    notFound();
  }

  const partnerName = "Good Trouble";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", padding: "1rem" }}>
      {PREVIEW_STATES.map((state) => {
        const copy = resolvePartnerHolderPresentation(state, partnerName);
        return (
          <section key={state} id={state} aria-label={copy.title}>
            <PartnerJourneyLayout
              partnerName={partnerName}
              intro="Release gate preview — production holder copy and layout."
              statusMessage={copy.message}
              partnerHomeUrl="https://www.goodtroublecanna.com"
              partnerReturnLabel={`Return to ${partnerName}`}
            >
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>{copy.title}</h2>
              <p style={{ margin: "0 0 1rem", lineHeight: 1.6 }}>{copy.message}</p>
              {state === "return_to_partner" && (
                <Btn variant="secondary">Return to {partnerName}</Btn>
              )}
            </PartnerJourneyLayout>
          </section>
        );
      })}
    </div>
  );
}
