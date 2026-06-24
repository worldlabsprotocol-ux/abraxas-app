"use client";
// FILE: components/dashboard/PurchaseLifecycleAdmin.tsx
// Real operational panel for the purchase lifecycle. Pulls open
// purchases, lets you move them Authorized -> Captured -> Settled, or
// mark Disputed. Large amounts show a risk flag, same idea as a fraud
// risk engine, sized for what's actually buildable solo.

import { useState, useEffect } from "react";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const A = "#F59E0B";
const RED = "#EF4444";
const W = "#15151A";
const BDR = "#E5E5E0";

interface PurchaseRow {
  id: string;
  item_name: string | null;
  price: string | null;
  email: string;
  lifecycle_status: string;
  risk_flag: string;
  created_at: string;
}

const STAGE_COLOR: Record<string, string> = {
  authorized: A, captured: "#3B82F6", disputed: RED, settled: G, refunded: "rgba(255,255,255,0.4)",
};

export function PurchaseLifecycleAdmin() {
  const [rows, setRows] = useState<PurchaseRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/purchases/list");
      const data = await res.json() as { purchases?: PurchaseRow[] };
      setRows(data.purchases ?? []);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function advance(id: string, status: string) {
    setBusyId(id);
    try {
      await fetch("/api/admin/purchases/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lifecycle_status: status }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (rows === null) return null;
  const open = rows.filter(r => r.lifecycle_status !== "settled" && r.lifecycle_status !== "refunded");

  return (
    <div style={{ marginBottom:"1.5rem", borderRadius:14, border:`1px solid ${BDR}`,
                   background:"rgba(13,17,23,0.5)", padding:"1.25rem" }}>
      <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:700, color:W,
                     marginBottom:"0.25rem" }}>
        Purchase Lifecycle
      </div>
      <div style={{ fontFamily:S, fontSize:"0.7rem", color:"rgba(21,21,26,0.4)",
                     marginBottom:"1rem" }}>
        {open.length} open, authorized but not yet settled
      </div>

      {open.length === 0 ? (
        <div style={{ fontFamily:S, fontSize:"0.74rem", color:"rgba(21,21,26,0.35)" }}>
          Nothing waiting on you right now.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.625rem" }}>
          {open.map(p => (
            <div key={p.id} style={{ padding:"0.75rem", borderRadius:10,
                                       background:"#FAFAF8", border:`1px solid ${BDR}`,
                                       display:"flex", justifyContent:"space-between",
                                       alignItems:"center", flexWrap:"wrap", gap:"0.625rem" }}>
              <div>
                <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:700, color:W,
                               display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  {p.item_name ?? p.id}
                  {p.risk_flag === "large_amount_review" && (
                    <span style={{ fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                                    color:A, background:`${A}18`, padding:"0.1rem 0.4rem",
                                    borderRadius:8 }}>
                      LARGE AMOUNT
                    </span>
                  )}
                </div>
                <div style={{ fontFamily:S, fontSize:"0.7rem", color:"rgba(21,21,26,0.4)" }}>
                  {p.price} · {p.email}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                                color: STAGE_COLOR[p.lifecycle_status] ?? "rgba(255,255,255,0.4)",
                                letterSpacing:"0.06em", textTransform:"uppercase" }}>
                  {p.lifecycle_status}
                </span>
                {p.lifecycle_status === "authorized" && (
                  <button onClick={() => advance(p.id, "captured")} disabled={busyId === p.id}
                    style={{ padding:"0.35rem 0.75rem", borderRadius:6, border:"none",
                              background:"#3B82F6", color:"#000", fontFamily:S,
                              fontSize:"0.7rem", fontWeight:700, cursor:"pointer" }}>
                    Mark Captured
                  </button>
                )}
                {p.lifecycle_status === "captured" && (
                  <button onClick={() => advance(p.id, "settled")} disabled={busyId === p.id}
                    style={{ padding:"0.35rem 0.75rem", borderRadius:6, border:"none",
                              background:G, color:"#000", fontFamily:S,
                              fontSize:"0.7rem", fontWeight:700, cursor:"pointer" }}>
                    Mark Settled
                  </button>
                )}
                <button onClick={() => advance(p.id, "disputed")} disabled={busyId === p.id}
                  style={{ padding:"0.35rem 0.75rem", borderRadius:6,
                            border:`1px solid ${RED}50`, background:"transparent",
                            color:RED, fontFamily:S, fontSize:"0.7rem",
                            fontWeight:700, cursor:"pointer" }}>
                  Dispute
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
