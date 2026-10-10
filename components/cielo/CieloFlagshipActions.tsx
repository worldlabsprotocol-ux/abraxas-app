"use client";
// FILE: components/cielo/CieloFlagshipActions.tsx
// Unified booking hub. calendar + reservation flow in institutional layout.

import { useCallback, useState } from "react";
import Link from "next/link";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { Btn } from "@/components/redesign/ui";
import { CieloAvailabilityPanel } from "./CieloAvailabilityPanel";
import { CieloBookingPanel } from "./CieloBookingPanel";
import { CIELO_FONT, cieloPanelStyle } from "./cieloBookingStyles";
import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";
import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";

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
            Abraxas verifies guest eligibility ({CIELO_VERIFIED_GUEST_POLICY_ID}) and issues a signed decision receipt.
            A verified-rate request is not a confirmed stay and does not replace Airbnb booking.
          </p>
        </div>
        <Btn href="/cielo/verified-rate" variant="secondary" size="sm">
          Start verified-guest flow →
        </Btn>
      </div>

      <p style={{
        fontFamily: CIELO_FONT,
        fontSize: "0.72rem",
        color: "var(--text-muted)",
        lineHeight: 1.55,
        margin: 0,
        textAlign: "center",
      }}>
        Book on Airbnb (external channel):{" "}
        <a href={CIELO_AIRBNB_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>
          View listing on Airbnb
        </a>
        {" "}— Abraxas does not access your Airbnb account or confirm reservations.
      </p>

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
  return <Inner />;
}
