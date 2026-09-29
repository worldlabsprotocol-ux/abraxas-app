// FILE: app/demo/relying-party/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { RelyingPartyPilotClient } from "@/components/demo/RelyingPartyPilotClient";

export const dynamic = "force-dynamic";

export default function RelyingPartyPilotPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={860}>
      <PageHeader
        eyebrow="Relying-party pilot"
        title="Verify once. Ask narrow policy questions."
        subtitle="End-to-end age 21+ Hosted Partner Flow demo using the age_21_retail policy pack. No wallet, zkLogin, stablecoin, or payment required."
      />
      <RelyingPartyPilotClient />
    </RedesignPage>
  );
}
