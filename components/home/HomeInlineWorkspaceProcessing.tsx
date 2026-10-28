"use client";
// FILE: components/home/HomeInlineWorkspaceProcessing.tsx
// Authentic Abraxas emblem processing state for homepage-embedded workspace.

import { AbraxasProcessingEmblem } from "@/components/brand/AbraxasProcessingEmblem";

export function HomeInlineWorkspaceProcessing({
  label,
  detail,
}: {
  label: string;
  detail?: string | null;
}) {
  return (
    <div className="abx-inline-workspace-processing" role="status" aria-live="polite">
      <div className="abx-inline-workspace-processing__emblem-wrap">
        <AbraxasProcessingEmblem size={56} />
      </div>
      <p className="abx-inline-workspace-processing__label">{label}</p>
      {detail ? <p className="abx-inline-workspace-processing__detail">{detail}</p> : null}
    </div>
  );
}
