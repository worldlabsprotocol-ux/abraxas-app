"use client";
// FILE: app/admin/value-evidence/page.tsx
// Operator value evidence — executive operating interface.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { ValueEvidenceDashboard } from "@/components/admin/ValueEvidenceDashboard";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { VALUE_EVIDENCE_NOTICE } from "@/lib/partner/valueEvidence/contract";

export default function AdminValueEvidencePage() {
  return (
    <RedesignPage accent="admin" maxWidth={1080}>
      <AbxPageHeader
        eyebrow="Operator"
        title="Value evidence"
        lead="Portfolio diligence, design partner progress, fundraising evidence, and investor claims — derived from canonical backend state."
      />
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "-0.5rem", marginBottom: "1rem" }}>
        {VALUE_EVIDENCE_NOTICE}
      </p>
      <ValueEvidenceDashboard />
    </RedesignPage>
  );
}
