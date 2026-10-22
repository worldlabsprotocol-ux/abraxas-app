"use client";

import type { ReactNode } from "react";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function IntegrationStudioEmptyState({
  title,
  lead,
  steps,
  action,
}: {
  title: string;
  lead: string;
  steps: string[];
  action: ReactNode;
}) {
  return (
    <section className="abx-studio-empty-state" aria-labelledby="studio-empty-title">
      <h2 id="studio-empty-title" className="abx-studio-empty-state__title">
        {title}
      </h2>
      <p className="abx-studio-empty-state__lead">{lead}</p>
      <ol className="abx-studio-empty-state__steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="abx-studio-empty-state__action">{action}</div>
    </section>
  );
}
