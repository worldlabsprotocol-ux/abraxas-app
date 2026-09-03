"use client";
// FILE: components/passport/PassportRecentActivity.tsx
// Customer-readable activity — no receipt IDs or policy IDs.

import { useQuery } from "@tanstack/react-query";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import type { IdentityUiState } from "@/lib/passport/identityUiState";

const FONT = ABRAXAS_FONT_SANS;

interface ShareRecord {
  partner_id: string;
  purpose: string | null;
  shared_at: string;
}

function friendlyPartnerLabel(partnerId: string): string {
  const cleaned = partnerId.replace(/[_-]+/g, " ").trim();
  if (!cleaned || cleaned.length < 3) return "a participating service";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

async function fetchShareHistory() {
  const res = await fetch("/api/credentials/share-history", { credentials: "include" });
  if (!res.ok) return { shares: [] as ShareRecord[] };
  return res.json() as Promise<{ shares: ShareRecord[] }>;
}

export function PassportRecentActivity({
  suiAddress,
  walletBound,
  identityUi,
}: {
  suiAddress: string | null;
  walletBound: boolean;
  identityUi: IdentityUiState;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["passport", "share-history", suiAddress],
    queryFn: fetchShareHistory,
    enabled: Boolean(suiAddress),
    staleTime: 30_000,
  });

  const events: string[] = [];
  if (suiAddress) events.push("Passport created");
  if (walletBound) events.push("Security confirmation completed");
  if (identityUi === "verified") events.push("Verified information added");

  data?.shares.slice(0, 5).forEach((share) => {
    events.push(`Proof shared with ${friendlyPartnerLabel(share.partner_id)}`);
  });

  return (
    <section
      aria-labelledby="passport-activity-heading"
      style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: PUBLIC_SURFACE.cardBorder,
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}
    >
      <h2 id="passport-activity-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.65rem",
      }}>
        Recent activity
      </h2>
      {isLoading && (
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>Loading…</p>
      )}
      {!isLoading && events.length === 0 && (
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Activity will appear here as you secure your Passport and share proof with services.
        </p>
      )}
      {!isLoading && events.length > 0 && (
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
