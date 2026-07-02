"use client";
// FILE: components/terminal/CieloAvailability.tsx
// SEPARATE FEATURE. shows real blocked/available dates pulled from
// your Airbnb iCal export. See lib/icalSync.ts for setup. Until
// AIRBNB_ICAL_URL is set, this honestly shows a setup notice instead
// of fake availability.

import { useState, useEffect } from "react";
import { S, G, BDR } from "./tokens";

interface BlockedDate { start: string; end: string; }

export function CieloAvailability() {
  const [blocked, setBlocked] = useState<BlockedDate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cielo/availability")
      .then(res => res.json())
      .then((data: { blocked?: BlockedDate[]; error?: string }) => {
        if (data.blocked) setBlocked(data.blocked);
        else setError(data.error ?? "Could not load availability");
      })
      .catch(() => setError("Could not load availability"));
  }, []);

  // Build next 30 days, mark blocked vs open
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  function isBlocked(dateIso: string): boolean {
    if (!blocked) return false;
    return blocked.some(b => dateIso >= b.start && dateIso < b.end);
  }

  if (error) {
    return (
      <div style={{ padding:"0.875rem", borderRadius:8,
                     background:"rgba(255,255,255,0.02)",
                     border:`1px dashed ${BDR}`, fontFamily:S,
                     fontSize:"0.74rem", color:"rgba(255,255,255,0.35)" }}>
        Live availability isn't connected yet. Check exact dates on the
        Airbnb listing directly for now.
      </div>
    );
  }

  return (
    <div style={{ padding:"0.875rem", borderRadius:8,
                   background:"rgba(255,255,255,0.02)",
                   border:`1px solid ${BDR}` }}>
      <div style={{ fontFamily:S, fontSize:"0.72rem", fontWeight:600,
                     color:"rgba(255,255,255,0.5)", marginBottom:"0.625rem" }}>
        Next 30 days
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(10,1fr)", gap:"3px" }}>
        {days.map(d => (
          <div key={d} title={d}
            style={{ aspectRatio:"1", borderRadius:3,
                      background: blocked === null ? "rgba(255,255,255,0.05)"
                                : isBlocked(d) ? "rgba(239,68,68,0.5)" : `${G}40` }} />
        ))}
      </div>
      <div style={{ display:"flex", gap:"1rem", marginTop:"0.625rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.375rem" }}>
          <div style={{ width:8, height:8, borderRadius:2, background:`${G}40` }} />
          <span style={{ fontFamily:S, fontSize:"0.66rem", color:"rgba(255,255,255,0.4)" }}>Open</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.375rem" }}>
          <div style={{ width:8, height:8, borderRadius:2, background:"rgba(239,68,68,0.5)" }} />
          <span style={{ fontFamily:S, fontSize:"0.66rem", color:"rgba(255,255,255,0.4)" }}>Booked</span>
        </div>
      </div>
    </div>
  );
}
