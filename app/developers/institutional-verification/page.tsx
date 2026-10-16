// FILE: app/developers/institutional-verification/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { InstitutionalVerificationClient } from "./InstitutionalVerificationClient";

export const metadata = {
  title: "Institutional trust verification · Abraxas Developers",
  description:
    "Integrate Abraxas signed trust decisions with offline cryptographic verification, pinned issuer keys, and explicit rejection reason codes.",
};

export default function InstitutionalVerificationPage() {
  return (
    <RedesignPage accent="developer" maxWidth={920}>
      <InstitutionalVerificationClient />
    </RedesignPage>
  );
}
