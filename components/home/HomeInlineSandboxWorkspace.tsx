"use client";
// FILE: components/home/HomeInlineSandboxWorkspace.tsx
// Mounts the real ephemeral sandbox workflow inside #start-sandbox (no route change).

import { Suspense } from "react";
import { EphemeralSandboxWorkspaceClient } from "@/components/account/EphemeralSandboxWorkspaceClient";
import { HomeInlineWorkspaceProcessing } from "@/components/home/HomeInlineWorkspaceProcessing";

export function HomeInlineSandboxWorkspace() {
  return (
    <div className="abx-inline-sandbox-workspace" data-homepage-workspace="1">
      <Suspense
        fallback={
          <HomeInlineWorkspaceProcessing
            label="Restoring your workspace"
            detail="Confirming authorized session with Abraxas servers."
          />
        }
      >
        <EphemeralSandboxWorkspaceClient surface="homepage" />
      </Suspense>
    </div>
  );
}
