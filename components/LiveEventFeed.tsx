// FILE: components/LiveEventFeed.tsx
// Polls /api/assets/[id]/timeline every 5s.
// Renders chronological event stream with color-coded types.
// Wire into AssetIntelligenceDrawer timeline tab.
"use client";

import { useState, useEffect, useRef } from "react";

const MONO = "'JetBrains Mono',monospace";

const TYPE_COLOR: Record<string, string> = {
  asset_created:                "rgba(200,169,110,0.7)",
  verification_status_changed:  "#14F195",
  collateral_scored:            "#a855f7",
  fraud_risk_updated:           "#f26b6b",
  VERIFICATION_APPROVED:        "#14F195",
  COLLATERAL_ACTIVATED:         "#14F195",
  RISK_SCORED:                  "#a855f7",
  FRAUD_FLAG_RAISED:            "#f26b6b",
  FRAUD_FLAG_RESOLVED:          "#14F195",
  TOKEN_MINTED:                 "#9945FF",
  CUSTODY_CONFIRMED:            "#6b8cff",
  ASSET_SUBMITTED:              "#C8A96E",
  asset_updated:                "rgba(255,255,255,0.3)",
};

const TYPE_LABEL: Record<string, string> = {
  asset_created:               "Asset Submitted",
  verification_status_changed: "Status Changed",
  collateral_scored:           "Risk Scored",
  fraud_risk_updated:          "Fraud Risk Updated",
  VERIFICATION_APPROVED:       "Verification Approved",
  COLLATERAL_ACTIVATED:        "Collateral Activated",
  RISK_SCORED:                 "Risk Score Updated",
  FRAUD_FLAG_RAISED:           "Fraud Flag Raised",
  TOKEN_MINTED:                "Certificate Minted",
  CUSTODY_CONFIRMED:           "Custody Confirmed",
  ASSET_SUBMITTED:             "Asset Submitted",
  asset_updated:               "Asset Updated",
};

interface Event {
  id:         string;
  event_type: string;
  actor:      string;
  actor_name: string | null;
  payload:    Record<string, unknown>;
  tx_hash:    string | null;
  created_at: string;
}

function ts(s: string) {
  const d = new Date(s);
  return d.toISOString().replace("T"," ").slice(0,19) + " UTC";
}
function shortAddr(s: string) {
  return s && s.length > 12 ? `${s.slice(0,6)}…${s.slice(-4)}` : s;
}

export function LiveEventFeed({
  assetId, pollIntervalMs = 5000,
}: {
  assetId:         string;
  pollIntervalMs?: number;
}) {
  const [events,  setEvents]  = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive,  setIsLive]  = useState(true);
  const countRef              = useRef(0);

  function load() {
    fetch(`/api/assets/${assetId}/timeline`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const incoming: Event[] = d.events ?? [];
        if (incoming.length !== countRef.current) {
          setEvents([...incoming].reverse()); // newest first
          countRef.current = incoming.length;
        }
        setIsLive(true);
      })
      .catch(() => setIsLive(false))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, pollIntervalMs);
    return () => clearInterval(iv);
  }, [assetId, pollIntervalMs]);

  if (loading) return(
    <div style={{ padding:"1.5rem", textAlign:"center", fontSize:"0.52rem",
                  color:"rgba(255,255,255,0.2)", fontFamily:MONO }}>
      Loading event timeline…
    </div>
  );

  return (
    <div>
      {/* Live indicator */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    marginBottom:"1rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.375rem" }}>
          <div style={{ width:6, height:6, borderRadius:"50%",
                        background: isLive ? "#14F195" : "#f26b6b",
                        animation:"pulse 1.5s ease-in-out infinite" }}/>
          <span style={{ fontSize:"0.42rem", fontWeight:700,
                         color: isLive ? "rgba(20,241,149,0.6)":"rgba(242,107,107,0.6)",
                         fontFamily:MONO, letterSpacing:"0.12em",
                         textTransform:"uppercase" }}>
            {isLive ? "Live Feed" : "Disconnected"}
          </span>
        </div>
        <span style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.2)", fontFamily:MONO }}>
          {events.length} events · {Math.round(pollIntervalMs/1000)}s refresh
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ padding:"1.5rem", textAlign:"center",
                      border:"1px solid rgba(255,255,255,0.06)",
                      borderRadius:"7px", fontSize:"0.52rem",
                      color:"rgba(255,255,255,0.18)" }}>
          No events recorded yet. Events appear here as the asset moves through verification.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {events.map((ev, i) => {
            const col   = TYPE_COLOR[ev.event_type] ?? "rgba(255,255,255,0.3)";
            const label = TYPE_LABEL[ev.event_type] ?? ev.event_type.replace(/_/g," ");
            const isLast = i === events.length - 1;
            return(
              <div key={ev.id} style={{ display:"flex", gap:"0.75rem", position:"relative" }}>
                {/* Connector */}
                {!isLast && (
                  <div style={{ position:"absolute", left:9, top:22, bottom:-1,
                                width:1, background:"rgba(255,255,255,0.06)", zIndex:0 }}/>
                )}
                {/* Dot */}
                <div style={{ width:18, height:18, borderRadius:"50%",
                              background:`${col}12`, border:`1.5px solid ${col}`,
                              flexShrink:0, marginTop:4, zIndex:1,
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:col }}/>
                </div>
                {/* Content */}
                <div style={{ flex:1, paddingBottom: isLast?"0":"0.875rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                alignItems:"flex-start", gap:"0.5rem", marginBottom:3 }}>
                    <span style={{ fontSize:"0.52rem", fontWeight:700,
                                   color: i===0 ? "#f0f0f0":"rgba(255,255,255,0.65)",
                                   lineHeight:1.2 }}>
                      {label}
                    </span>
                    <span style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.2)",
                                   fontFamily:MONO, flexShrink:0 }}>
                      {ts(ev.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize:"0.4rem", color:"rgba(255,255,255,0.3)",
                                fontFamily:MONO }}>
                    {ev.actor_name ?? shortAddr(ev.actor)} · {ev.actor.startsWith("SYSTEM")?"Protocol":"Partner"}
                  </div>
                  {ev.tx_hash && (
                    <a href={`https://solscan.io/tx/${ev.tx_hash}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:"0.36rem", color:"rgba(107,140,255,0.6)",
                               fontFamily:MONO, textDecoration:"none" }}>
                      {shortAddr(ev.tx_hash)} →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}