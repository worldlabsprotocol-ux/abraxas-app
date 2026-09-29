"use client";
// FILE: components/product/EnvironmentBadge.tsx

import { AbxStatusBadge } from "@/components/design/AbxPrimitives";

export type ProductEnvironment = "sandbox" | "production";

export function EnvironmentBadge({ environment }: { environment: ProductEnvironment | string }) {
  const normalized = environment.toLowerCase();
  const isProduction = normalized === "production";
  return (
    <AbxStatusBadge
      label={isProduction ? "Production" : "Sandbox"}
      tone={isProduction ? "success" : "warning"}
    />
  );
}
