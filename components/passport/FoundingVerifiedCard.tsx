"use client";
// FILE: components/passport/FoundingVerifiedCard.tsx

import { useState, useEffect } from "react";

const S = "system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";

interface FoundingVerifiedCardProps {
  walletOrContext: string;
  hasWallet: boolean;
  hasIdentity: boolean;
}

export function FoundingVerifiedCard({ walletOrContext, hasWallet, hasIdentity }: FoundingVerifiedCardProps) {
  const [seatsRemaining, setSeatsRemaining] = useState<number | null>(null);
  const [maxSeats, setMaxSeats] = useState<number>(250);
  const [claimedSeat, setClaimedSeat] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/passport/genesis/availability")
      .then(res => res.json())
      .then(data => { setSeatsRemaining(data.seatsRemaining); setMaxSeats(data.maxSeats); })
      .catch(() => {});
  }, []);

  const eligible = hasWallet && hasIdentity;
  const soldOut = seatsRemaining !== null && seatsRemaining <= 0;

  async function claim() {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch("/api/passport/genesis/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletOrContext, hasWallet, hasIdentity }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setClaimedSeat(data.seatNumber);
    } catch {
      setError("Could not process claim, try again");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div style={{ padding:"1.125rem", borderRadius:12, border:`1.5px solid ${G}40`,
                   background:`${G}08`, marginBottom:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
                     alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <div style={{ fontFamily:M, fontSize:"0.62rem", fontWeight:700,
                         color:G, letterSpacing:"0.08em", marginBottom:"0.3rem" }}>
            FOUNDING VERIFIED — {maxSeats} SEATS ONLY
          </div>
          <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                         color:"var(--text-primary)", marginBottom:"0.3rem" }}>
            A permanent credential for the first {maxSeats} people who complete real verification
          </div>
          <p style={{ fontFamily:S, fontSize:"0.78rem", color:"var(--text-secondary)",
                       lineHeight:1.6, maxWidth:480, margin:0 }}>
            No stake, no token burn. Sign in with Google (Sui wallet created via zkLogin),
            complete Identity Verified — the seat is yours, permanently, non-transferable.
          </p>
        </div>
        {seatsRemaining !== null && (
          <div style={{ textAlign:"center", flexShrink:0 }}>
            <div style={{ fontFamily:M, fontSize:"1.5rem", fontWeight:800, color:G }}>
              {seatsRemaining}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.62rem", color:"var(--text-muted)" }}>
              seats left
            </div>
          </div>
        )}
      </div>

      {claimedSeat !== null ? (
        <div style={{ marginTop:"0.875rem", padding:"0.75rem", borderRadius:8,
                       background:`${G}15`, fontFamily:S, fontSize:"0.82rem",
                       fontWeight:700, color:G }}>
          Seat #{claimedSeat} claimed. Founding Verified, permanently.
        </div>
      ) : (
        <button onClick={claim} disabled={!eligible || soldOut || claiming}
          style={{ marginTop:"0.875rem", padding:"0.6rem 1.25rem", borderRadius:8, border:"none",
                    background: eligible && !soldOut ? G : "var(--surface-raised)",
                    color: eligible && !soldOut ? "#000" : "var(--text-muted)",
                    fontFamily:S, fontSize:"0.82rem", fontWeight:700,
                    cursor: eligible && !soldOut ? "pointer" : "not-allowed" }}>
          {soldOut ? "All seats claimed"
            : !eligible ? "Sign in + complete Identity Verified first"
            : claiming ? "Claiming..." : "Claim Founding Verified"}
        </button>
      )}
      {error && (
        <div style={{ fontFamily:S, fontSize:"0.72rem", color:"#EF4444", marginTop:"0.5rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}
