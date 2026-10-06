"use client";
// FILE: components/partner/HolderOpeningBrief.tsx
// Five-second holder opening — who, why, shared vs withheld.

import type { CSSProperties } from "react";
import { PrivacyDisclosureCard } from "@/components/product/PrivacyDisclosureCard";
import type { HolderOpeningPresentation } from "@/lib/partner/holderExperience/opening";

const note: CSSProperties = {
  margin: "0.65rem 0 0",
  fontSize: "0.74rem",
  lineHeight: 1.55,
  color: "var(--text-muted, #9ca3af)",
};

export function HolderOpeningBrief({ opening }: { opening: HolderOpeningPresentation }) {
  return (
    <section aria-labelledby="holder-opening-heading" className="abx-holder-opening-brief">
      <h2 id="holder-opening-heading" style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 800, lineHeight: 1.45 }}>
        {opening.headline}
      </h2>
      <PrivacyDisclosureCard
        compact
        requester={undefined}
        requestReason={opening.requestReason}
        requested={opening.requested}
        shared={opening.shared}
        withheld={opening.withheld}
        requestedTitle="Abraxas will confirm"
        sharedTitle="Shared with this application"
        withheldTitle="Not shared with this application"
        footer={
          <>
            <p style={{ ...note, marginTop: "0.75rem" }}>
              <strong>{opening.environmentLabel}.</strong> {opening.environmentDetail}
            </p>
            {opening.footerNotes.map((line) => (
              <p key={line} style={note}>{line}</p>
            ))}
          </>
        }
      />
    </section>
  );
}
