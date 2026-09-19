import { ACCOUNT_ACCESS_FIRST_PAINT } from "@/lib/product/publicOrigin";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

export function AccountAccessFirstPaint({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <p
      data-testid="account-access-first-paint"
      style={{
        fontFamily: ABRAXAS_FONT_SANS,
        fontSize: compact ? "0.82rem" : "0.92rem",
        lineHeight: 1.6,
        color: "var(--text-secondary)",
        margin: compact ? "0.75rem auto" : "1.5rem auto",
        maxWidth: 640,
        padding: "0 1rem",
        textAlign: "center",
      }}
    >
      {ACCOUNT_ACCESS_FIRST_PAINT}
    </p>
  );
}
