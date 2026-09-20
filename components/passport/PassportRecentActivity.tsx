"use client";
// FILE: components/passport/PassportRecentActivity.tsx
// Local Passport milestones only. Partner sharing lives in verification activity.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import type { IdentityUiState } from "@/lib/passport/identityUiState";

const FONT = ABRAXAS_FONT_SANS;

export function PassportRecentActivity({
  suiAddress,
  walletBound,
  identityUi,
}: {
  suiAddress: string | null;
  walletBound: boolean;
  identityUi: IdentityUiState;
}) {
  const events: string[] = [];
  if (suiAddress) events.push("Passport created");
  if (walletBound) events.push("Security confirmation completed");
  if (identityUi === "verified") events.push("Verified information added");

  return (
    <section
      aria-labelledby="passport-setup-activity-heading"
      style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: PUBLIC_SURFACE.cardBorder,
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}
    >
      <h2 id="passport-setup-activity-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.65rem",
      }}>
        Recent setup
      </h2>
      {events.length === 0 && (
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Setup steps appear here as you secure your Passport.
        </p>
      )}
      {events.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {events.map((event) => (
            <li key={event} style={{
              fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: "0.25rem",
            }}>
              {event}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
