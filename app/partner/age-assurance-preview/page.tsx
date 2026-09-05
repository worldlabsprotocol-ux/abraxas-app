// FILE: app/partner/age-assurance-preview/page.tsx
// Preview-only age-assurance method selection — production copy, no live API.

import { notFound } from "next/navigation";
import { PartnerJourneyLayout } from "@/components/partner/PartnerJourneyLayout";
import {
  partnerHolderPrivacyNotes,
  resolvePartnerHolderPresentation,
} from "@/lib/partner/partnerHolderCopy";
import { Btn } from "@/components/redesign/ui";

function isPreviewGateAllowed(): boolean {
  if (process.env.PARTNER_RELEASE_GATE_PREVIEW === "true") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return process.env.NODE_ENV === "development";
}

export default function AgeAssurancePreviewPage() {
  if (!isPreviewGateAllowed()) {
    notFound();
  }

  const partnerName = "Good Trouble";
  const privacy = partnerHolderPrivacyNotes(partnerName);
  const chooseCopy = resolvePartnerHolderPresentation("choose_private_method", partnerName);
  const fallbackCopy = resolvePartnerHolderPresentation("id_upload_fallback", partnerName);
  const existingCopy = resolvePartnerHolderPresentation("existing_proof_accepted", partnerName);

  return (
    <div id="age-assurance-method-selection" style={{ padding: "1rem" }}>
      <PartnerJourneyLayout
        partnerName={partnerName}
        intro="Privacy-first age assurance — method selection preview."
        statusMessage={chooseCopy.message}
        partnerHomeUrl="https://www.goodtroublecanna.com"
        partnerReturnLabel={`Return to ${partnerName}`}
      >
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
          {privacy.auth_not_age}
        </p>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
          {privacy.partner_minimal}
        </p>
        <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
          {privacy.merchant_obligation}
        </p>

        <section style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{existingCopy.title}</p>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>{existingCopy.message}</p>
          <Btn>Use my existing Abraxas age proof</Btn>
        </section>

        <section style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{chooseCopy.title}</p>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
            Private providers appear here when configured (digital wallet, verified email, payment card).
          </p>
        </section>

        <section style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{fallbackCopy.title}</p>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", lineHeight: 1.6 }}>{privacy.id_fallback}</p>
          <Btn variant="secondary">{fallbackCopy.action_label}</Btn>
        </section>

        <Btn variant="secondary">Use the traditional partner option</Btn>
      </PartnerJourneyLayout>
    </div>
  );
}
