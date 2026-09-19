// FILE: components/product/PublicJourneyNextSteps.tsx
// Shared next-step cluster so technical pages do not dead-end.

import { Btn } from "@/components/redesign/ui";
import { PUBLIC_JOURNEY_NEXT_STEPS } from "@/lib/product/publicJourneyManifest";

export function PublicJourneyNextSteps({
  title = "Continue from here",
}: {
  title?: string;
}) {
  return (
    <div
      data-public-journey-next-steps="true"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        marginTop: "0.85rem",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          width: "100%",
          fontFamily: "var(--font-sans), system-ui, sans-serif",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {title}
      </span>
      {PUBLIC_JOURNEY_NEXT_STEPS.map((step) => (
        <Btn key={step.href} href={step.href} size="sm" variant="secondary">
          {step.label} →
        </Btn>
      ))}
    </div>
  );
}
