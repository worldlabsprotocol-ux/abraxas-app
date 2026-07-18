import type { Metadata } from "next";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { VerificationCostCalculator } from "@/components/tools/VerificationCostCalculator";
import { Btn } from "@/components/redesign/ui";

export const metadata: Metadata = {
  title: "Verification Cost Calculator | Abraxas",
  description: "Estimate cost of repeated KYC per application vs reusable verification infrastructure.",
};

export default function VerificationCostCalculatorPage() {
  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow="Tools"
        title="Verification cost calculator"
        subtitle="Repeated KYC per app vs verify-once infrastructure — for planning and board conversations."
      />
      <VerificationCostCalculator />
      <div style={{ marginTop: "1.25rem", marginBottom: "2rem" }}>
        <Btn href="/developers" size="lg">See integration path →</Btn>
      </div>
    </RedesignPage>
  );
}
