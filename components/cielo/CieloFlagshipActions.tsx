"use client";
// FILE: components/cielo/CieloFlagshipActions.tsx
// Unified booking hub — calendar + reservation flow in institutional layout.

import { useCallback, useState } from "react";
import Link from "next/link";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { Btn } from "@/components/redesign/ui";
import { CieloAvailabilityPanel } from "./CieloAvailabilityPanel";
import { CieloBookingPanel } from "./CieloBookingPanel";
import { CIELO_FONT, cieloPanelStyle } from "./cieloBookingStyles";

function Inner() {
  const { suiAddress } = useSuiAuth();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const handleSelectDate = useCallback((dateIso: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateIso);
      setCheckOut("");
      return;
    }
    if (dateIso > checkIn) {
      setCheckOut(dateIso);
      return;
    }
    setCheckIn(dateIso);
    setCheckOut("");
  }, [checkIn, checkOut]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
      <div className="abx-glass-panel" style={{
        ...cieloPanelStyle,
        padding: "1rem 1.15rem",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}>
        <div style={{ flex: "1 1 220px" }}>
          <div style={{ fontFamily: CIELO_FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Passport verified-rate pilot
          </div>
          <p style={{ fontFamily: CIELO_FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
            Account + wallet bind unlock a rate request — not a confirmed booking.
          </p>
        </div>
        <Btn href="/cielo/verified-rate" variant="secondary" size="sm">
          Check verified rate →
        </Btn>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: "1rem",
        alignItems: "start",
      }}>
        <CieloAvailabilityPanel
          selectedRange={{ start: checkIn, end: checkOut }}
          onSelectDate={handleSelectDate}
        />
        <CieloBookingPanel
          suiAddress={suiAddress}
          variant="inline"
          checkIn={checkIn}
          checkOut={checkOut}
          onDatesChange={(ci, co) => {
            setCheckIn(ci);
            setCheckOut(co);
          }}
        />
      </div>

      <p style={{
        fontFamily: CIELO_FONT,
        fontSize: "0.72rem",
        color: "var(--text-muted)",
        lineHeight: 1.55,
        margin: 0,
        textAlign: "center",
      }}>
        Already submitted?{" "}
        <Link href="/cielo/status" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          Track booking status
        </Link>
        {" · "}
        <Link href="/cielo/receipt" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          View receipt
        </Link>
      </p>
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
