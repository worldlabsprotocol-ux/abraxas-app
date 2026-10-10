import { AbxPageShell } from "@/components/design/AbxPageShell";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { JudgeProductTour } from "@/components/experience/JudgeProductTour";

export const metadata = {
  title: "Product tour · Abraxas",
  description: "Simulated walkthrough of verify-once eligibility and partner reuse — no real identity documents.",
};

export default function ExperienceTourPage() {
  return (
    <AbxPageShell accent="neutral" maxWidth={800} contentStyle={{ paddingTop: "clamp(2rem,5vw,3rem)", paddingBottom: "3rem" }}>
      <AbxPageHeader
        accent="neutral"
        eyebrow="Guided demonstration"
        title="See Abraxas in under a minute"
        lead="Interactive simulation for judges and investors. No wallet, documents, or live credentials required."
      />
      <JudgeProductTour />
    </AbxPageShell>
  );
}
