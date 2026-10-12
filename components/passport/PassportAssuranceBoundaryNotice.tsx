"use client";

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function PassportAssuranceBoundaryNotice() {
  return (
    <section
      className="abx-passport-boundary"
      aria-label="Identity versus partner authorization"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "0.85rem 1rem",
        marginBottom: "1rem",
        background: "var(--surface-inset)",
      }}
    >
      <h2 style={{ fontFamily: FONT, fontSize: "0.82rem", margin: "0 0 0.35rem", color: "var(--text-primary)" }}>
        Three separate trust layers
      </h2>
      <ul style={{ fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.25rem" }}>
        <li>
          <strong>Identity verification</strong> — whether Abraxas has completed ID review for your account (not global approval for every partner).
        </li>
        <li>
          <strong>Credential validity</strong> — whether stored credentials are active, expired, revoked, or need refresh before reuse.
        </li>
        <li>
          <strong>Partner authorization</strong> — whether a specific policy returned PERMIT for a single request; never treat one permit as universal clearance.
        </li>
      </ul>
    </section>
  );
}
