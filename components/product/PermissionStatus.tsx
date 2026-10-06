"use client";
// FILE: components/product/PermissionStatus.tsx

import { AbxStatusBadge } from "@/components/design/AbxPrimitives";
import type { AbxStatusTone } from "@/lib/design/abraxasDesignSystem";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

const PERMISSION_TONE: Record<string, AbxStatusTone> = {
  approved: "success",
  pending: "warning",
  denied: "error",
  missing: "neutral",
  ready: "success",
};

export interface PermissionRow {
  label: string;
  status: string;
}

export function PermissionStatusList({ permissions }: { permissions: PermissionRow[] }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.45rem" }}>
      {permissions.map((p) => (
        <li
          key={p.label}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}
        >
          <span style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-primary)" }}>{p.label}</span>
          <AbxStatusBadge label={p.status.replace(/_/g, " ")} tone={PERMISSION_TONE[p.status] ?? "neutral"} />
        </li>
      ))}
    </ul>
  );
}
