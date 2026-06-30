"use client";
// FILE: components/passport/SuiDevnetPassportPanel.tsx
// Debug panel: fetch and display Abraxas Passport objects on Sui devnet.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STAMP_BIT_ORDER } from "@/lib/passport/stamps";
import { SUI_DEVNET, suiExplorerObject, suiExplorerTx } from "@/lib/sui/config";
import type { ParsedSuiPassport } from "@/lib/sui/parsePassport";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const STAMP_LABELS: Record<string, string> = {
  identity: "Identity",
  biometric: "Biometric",
  business: "Business",
  owner: "Owner",
  royalty: "Royalty",
  property: "Property",
  tribal: "Tribal",
  compliance: "Compliance",
  lending: "Lending",
  social: "Social",
};

interface ApiPassportResponse {
  network: string;
  deployment: typeof SUI_DEVNET;
  passport?: ParsedSuiPassport;
  passports?: ParsedSuiPassport[];
  error?: string;
}

function truncateId(id: string, head = 8, tail = 6): string {
  if (id.length <= head + tail + 3) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

function PassportCard({ passport }: { passport: ParsedSuiPassport }) {
  return (
    <div style={{
      background: "var(--surface, rgba(255,255,255,0.03))",
      border: "1px solid var(--border, rgba(255,255,255,0.08))",
      borderRadius: 12,
      padding: "1rem",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <span style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase",
          padding: "0.2rem 0.5rem", borderRadius: 999,
          border: `1px solid ${ACCENT}44`, background: `${ACCENT}14`,
        }}>
          Sui devnet
        </span>
        <span style={{
          fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)",
        }}>
          bitmask {passport.stampBitmask}
        </span>
      </div>

      <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.75rem", wordBreak: "break-all" }}>
        {passport.objectId}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {[
          { k: "Subject", v: truncateId(passport.subject) },
          { k: "Version", v: String(passport.passportVersion) },
          { k: "Nonce", v: String(passport.nonce) },
          { k: "Revoked", v: passport.revoked ? "yes" : "no" },
          { k: "Expires", v: passport.expiresAt === 0 ? "never" : String(passport.expiresAt) },
        ].map(row => (
          <div key={row.k}>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{row.k}</div>
            <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-primary)" }}>{row.v}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
        Stamps ({passport.stampIds.length}/{STAMP_BIT_ORDER.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.75rem" }}>
        {STAMP_BIT_ORDER.map(id => {
          const active = passport.stampIds.includes(id);
          return (
            <span key={id} style={{
              fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600,
              padding: "0.25rem 0.55rem", borderRadius: 999,
              color: active ? ACCENT : "var(--text-muted)",
              background: active ? `${ACCENT}18` : "transparent",
              border: `1px solid ${active ? `${ACCENT}55` : "var(--border)"}`,
              opacity: active ? 1 : 0.55,
            }}>
              {STAMP_LABELS[id] ?? id}
            </span>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Link href={suiExplorerObject(passport.objectId)} target="_blank" rel="noopener noreferrer"
          style={{ padding: "0.4rem 0.85rem", borderRadius: 999, border: "1px solid var(--border)", color: ACCENT, fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, textDecoration: "none" }}>
          View on Suiscan ↗
        </Link>
      </div>
    </div>
  );
}

export function SuiDevnetPassportPanel({ compact = false }: { compact?: boolean }) {
  const [objectId, setObjectId] = useState(SUI_DEVNET.demoPassportObjectId);
  const [passport, setPassport] = useState<ParsedSuiPassport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPassport = useCallback(async (id?: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = id ? `?objectId=${encodeURIComponent(id)}` : "";
      const res = await fetch(`/api/sui/passport${q}`);
      const data = (await res.json()) as ApiPassportResponse;
      if (!res.ok) {
        setPassport(null);
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      const p = data.passport ?? data.passports?.[0] ?? null;
      setPassport(p);
      if (!p) setError("No passport found");
    } catch (e) {
      setPassport(null);
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPassport(SUI_DEVNET.demoPassportObjectId);
  }, [fetchPassport]);

  return (
    <div style={{
      background: "var(--surface-raised, rgba(255,255,255,0.02))",
      border: "1px solid var(--border)",
      borderRadius: compact ? 12 : 16,
      padding: compact ? "1rem" : "1.5rem",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            Sui devnet · live object
          </div>
          <div style={{ fontFamily: FONT, fontSize: compact ? "0.88rem" : "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
            View devnet passport
          </div>
          {!compact && (
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.65, maxWidth: 520 }}>
              Abraxas Passport Move module deployed on Sui devnet. Query any Passport object ID or load the demo bootstrap passport.
            </p>
          )}
        </div>
        <Link href={`/api/sui/passport?objectId=${SUI_DEVNET.demoPassportObjectId}`} target="_blank"
          style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT, textDecoration: "none" }}>
          GET /api/sui/passport →
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          value={objectId}
          onChange={e => setObjectId(e.target.value)}
          placeholder="Passport object ID"
          style={{
            flex: "1 1 280px", minWidth: 0,
            fontFamily: MONO, fontSize: "0.72rem",
            padding: "0.55rem 0.75rem", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="button"
          onClick={() => fetchPassport(objectId.trim())}
          disabled={loading || !objectId.trim()}
          style={{
            padding: "0.55rem 1rem", borderRadius: 999, border: "none",
            background: ACCENT, color: "#000", fontFamily: FONT,
            fontSize: "0.78rem", fontWeight: 700, cursor: loading ? "wait" : "pointer",
            opacity: loading || !objectId.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Loading…" : "Lookup"}
        </button>
        <button
          type="button"
          onClick={() => {
            setObjectId(SUI_DEVNET.demoPassportObjectId);
            fetchPassport(SUI_DEVNET.demoPassportObjectId);
          }}
          disabled={loading}
          style={{
            padding: "0.55rem 1rem", borderRadius: 999,
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-secondary)", fontFamily: FONT,
            fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          Demo passport
        </button>
      </div>

      <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
        Package {truncateId(SUI_DEVNET.packageId, 10, 8)} ·{" "}
        <Link href={suiExplorerTx(SUI_DEVNET.publishTxDigest)} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>
          publish tx ↗
        </Link>
        {" · "}
        <Link href={suiExplorerTx(SUI_DEVNET.demoBootstrapTxDigest)} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>
          bootstrap tx ↗
        </Link>
      </div>

      {error && !passport && (
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#E0524F", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      {passport && <PassportCard passport={passport} />}
    </div>
  );
}
