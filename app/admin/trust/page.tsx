"use client";
// FILE: app/admin/trust/page.tsx
// Minimal trust layer inspector. credentials, issuers, receipt validity.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const MONO = "'JetBrains Mono',monospace";

export default function AdminTrustPage() {
  const [pin, setPin] = useState("");
  const [tab, setTab] = useState<"issuers" | "credential">("issuers");
  const [issuers, setIssuers] = useState<Array<{ id: string; display_name: string; issuer_status: string; supported_claims: string[]; pilot_note?: string }>>([]);
  const [claimId, setClaimId] = useState("");
  const [credentialDetail, setCredentialDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = { "x-admin-pin": pin };

  const loadIssuers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/issuers", { headers });
      const data = await res.json() as { issuers?: typeof issuers; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setIssuers(data.issuers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [pin]);

  useEffect(() => { if (tab === "issuers") void loadIssuers(); }, [tab, loadIssuers]);

  async function loadCredential() {
    if (!claimId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/credentials/${claimId.trim()}`, { headers });
      const data = await res.json() as Record<string, unknown> & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Not found");
      setCredentialDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setCredentialDetail(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060810", color: "#f0f0f0", fontFamily: MONO, fontSize: "0.68rem" }}>
      <header style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/admin/receipts" style={{ color: "#a78bfa", textDecoration: "none" }}>← Receipts</Link>
          {" · "}
          <Link href="/admin/connect" style={{ color: "#a78bfa", textDecoration: "none" }}>Connect</Link>
        <h1 style={{ fontSize: "0.85rem", margin: "0.35rem 0 0" }}>Trust Layer (pilot)</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", margin: "0.25rem 0 0" }}>Credential status · Issuer registry · Live receipt validity</p>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1rem 1.5rem" }}>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Admin PIN" style={{ marginBottom: "1rem", padding: "0.35rem 0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#f0f0f0" }} />

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {(["issuers", "credential"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{ padding: "0.35rem 0.75rem", background: tab === t ? "rgba(124,58,237,0.2)" : "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#f0f0f0", cursor: "pointer" }}>
              {t === "issuers" ? "Issuers" : "Credential timeline"}
            </button>
          ))}
        </div>

        {error && <div style={{ color: "#f26b6b", marginBottom: "0.75rem" }}>{error}</div>}
        {loading && <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</div>}

        {tab === "issuers" && (
          <div>
            {issuers.map(i => (
              <div key={i.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>{i.display_name} <span style={{ color: "rgba(255,255,255,0.35)" }}>({i.id})</span></div>
                <div style={{ color: "rgba(255,255,255,0.45)" }}>{i.issuer_status} · {i.supported_claims.join(", ")} · {i.pilot_note ?? "pilot"}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "credential" && (
          <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input value={claimId} onChange={e => setClaimId(e.target.value)} placeholder="Claim UUID" style={{ flex: 1, padding: "0.35rem 0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#f0f0f0" }} />
              <button type="button" onClick={() => void loadCredential()} style={{ padding: "0.35rem 0.75rem", cursor: "pointer" }}>Inspect</button>
            </div>
            {credentialDetail && (
              <pre style={{ whiteSpace: "pre-wrap", color: "rgba(255,255,255,0.7)", fontSize: "0.62rem" }}>
                {JSON.stringify(credentialDetail, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
