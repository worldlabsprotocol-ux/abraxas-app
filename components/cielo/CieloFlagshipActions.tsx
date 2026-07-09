"use client";
// FILE: components/cielo/CieloFlagshipActions.tsx

import Link from "next/link";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { CieloAvailabilityPanel } from "./CieloAvailabilityPanel";
import { CieloBookingPanel } from "./CieloBookingPanel";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

function Inner() {
  const { suiAddress } = useSuiAuth();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
      <Link href="/cielo/verified-rate" style={{
        display: "block",
        padding: "0.85rem 1rem",
        borderRadius: 14,
        background: "rgba(16,185,129,0.1)",
        border: "1px solid rgba(16,185,129,0.35)",
        textDecoration: "none",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: ACCENT, marginBottom: 4 }}>
          Check verified rate →
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          Passport unlocks a pilot verified-rate request — account, profile, wallet bind, and consent. Not a confirmed booking.
        </div>
      </Link>
      <CieloAvailabilityPanel />
      <CieloBookingPanel suiAddress={suiAddress} variant="inline" />
    </div>
  );
}

export function CieloFlagshipActions() {
  return (
    <SuiAuthProvider>
      <Inner />
    </SuiAuthProvider>
  );
}
