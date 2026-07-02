"use client";
// FILE: components/cielo/CieloFlagshipActions.tsx

import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { CieloAvailabilityPanel } from "./CieloAvailabilityPanel";
import { CieloBookingPanel } from "./CieloBookingPanel";

function Inner() {
  const { suiAddress } = useSuiAuth();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
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
