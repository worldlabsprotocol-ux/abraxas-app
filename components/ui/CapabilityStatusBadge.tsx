"use client";
// FILE: components/ui/CapabilityStatusBadge.tsx

import { CAPABILITY_STATUS_META, type CapabilityStatus } from "@/lib/capabilityStatus";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function CapabilityStatusBadge({
  status,
  size = "sm",
}: {
  status: CapabilityStatus;
  size?: "sm" | "xs";
}) {
  const meta = CAPABILITY_STATUS_META[status];
  return (
    <span
      title={meta.description}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: size === "xs" ? "0.1rem 0.35rem" : "0.18rem 0.45rem",
        borderRadius: 999,
        fontFamily: FONT,
        fontSize: size === "xs" ? "0.48rem" : "0.52rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: meta.color,
        background: `${meta.color}14`,
        border: `1px solid ${meta.color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}
