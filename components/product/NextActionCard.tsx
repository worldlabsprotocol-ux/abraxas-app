"use client";
// FILE: components/product/NextActionCard.tsx

import { Btn } from "@/components/redesign/ui";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

export function NextActionCard({
  title = "Next action",
  action,
  detail,
  href,
  onAction,
  buttonLabel = "Continue",
}: {
  title?: string;
  action: string;
  detail?: string;
  href?: string;
  onAction?: () => void;
  buttonLabel?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(96,165,250,0.35)",
        background: "rgba(96,165,250,0.08)",
        padding: "0.85rem 1rem",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#60A5FA", margin: "0 0 0.35rem" }}>
        {title}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
        {action}
      </p>
      {detail && (
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.5 }}>
          {detail}
        </p>
      )}
      {(href || onAction) && (
        <Btn size="sm" href={href} onClick={onAction}>
          {buttonLabel}
        </Btn>
      )}
    </div>
  );
}
