"use client";
// FILE: app/admin/connect/page.tsx

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";

export default function AdminConnectPage() {
  const [pin, setPin] = useState(ADMIN_PIN);
  const [requestId, setRequestId] = useState("");
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  async function load() {
    if (!requestId.trim()) return;
    setError("");
    const res = await fetch(`/api/admin/connect/authorization-requests/${requestId.trim()}`, {
      headers: { "x-admin-pin": pin },
    });
    const data = await res.json() as Record<string, unknown> & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Not found");
      setDetail(null);
      return;
    }
    setDetail(data);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060810", color: "#f0f0f0", fontFamily: "monospace", fontSize: "0.68rem", padding: "1.5rem" }}>
      <Link href="/admin/trust" style={{ color: "#a78bfa" }}>← Trust</Link>
      <h1 style={{ fontSize: "0.9rem" }}>Connect authorization inspector</h1>
      <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Admin PIN" style={{ margin: "0.5rem 0", padding: "0.35rem" }} />
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input value={requestId} onChange={e => setRequestId(e.target.value)} placeholder="car_…" style={{ flex: 1, padding: "0.35rem" }} />
        <button type="button" onClick={() => void load()}>Inspect</button>
      </div>
      {error && <p style={{ color: "#f26b6b" }}>{error}</p>}
      {detail && <pre style={{ whiteSpace: "pre-wrap", color: "rgba(255,255,255,0.7)" }}>{JSON.stringify(detail, null, 2)}</pre>}
    </div>
  );
}
