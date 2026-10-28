"use client";
// FILE: components/home/HomeInlineWorkspaceProcessing.tsx
// Authentic Abraxas emblem processing state for homepage-embedded workspace.

import Image from "next/image";

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
        <Image
          src="/brand/official/abraxas-emblem-protocol-640.webp"
          alt=""
          width={56}
          height={56}
          className="abx-inline-workspace-processing__emblem"
          priority
        />
        <span className="abx-inline-workspace-processing__pulse" aria-hidden />
      </div>
      <p className="abx-inline-workspace-processing__label">{label}</p>
      {detail ? <p className="abx-inline-workspace-processing__detail">{detail}</p> : null}
    </div>
  );
}
