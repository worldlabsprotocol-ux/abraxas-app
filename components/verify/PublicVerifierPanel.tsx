"use client";
// FILE: components/verify/PublicVerifierPanel.tsx
// Public Registry Verifier — paste DID, Sui address, credential JWT, or asset ID.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { VerifierResponse } from "@/lib/verifyRegistry";
import { ASSURANCE_LEVELS } from "@/lib/assuranceTaxonomy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const STATE_STYLES = {
  RESOLVED_VALID: { bg: "#10B981", label: "✓ VERIFIED & ACTIVE" },
  RESOLVED_REVOKED: { bg: "#DC2626", label: "⚠ EXPIRED OR REVOKED" },
  NULL_STATE: { bg: "#64748B", label: "∅ NOT FOUND" },
};

export function PublicVerifierPanel() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifierResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      void runVerify(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function runVerify(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch(`/api/verify/registry?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as VerifierResponse;
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? "Lookup failed");
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  const badge = result ? STATE_STYLES[result.state] : null;
  const taxonomy = result?.assurance_taxonomy ?? {};

  return (
    <div>
      <div style={{
        display: "flex", gap: "0.65rem", flexWrap: "wrap",
        marginBottom: "1.5rem",
      }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void runVerify(query); }}
          placeholder="Paste Passport DID, Sui address, credential JWT, or asset ID (e.g. ABX-RE-HOSP-001)…"
          style={{
            flex: "1 1 280px", minWidth: 0,
            padding: "0.85rem 1rem", borderRadius: 12,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
            color: "var(--text-primary)",
            fontFamily: MONO, fontSize: "0.78rem",
          }}
        />
        <button
          type="button"
          disabled={loading || !query.trim()}
          onClick={() => void runVerify(query)}
          style={{
            padding: "0.85rem 1.5rem", borderRadius: 12, border: "none",
            background: loading ? "var(--surface)" : "#10B981",
            color: loading ? "var(--text-muted)" : "#fff",
            fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Checking…" : "Verify"}
        </button>
      </div>

      {err && (
        <div style={{ padding: "0.85rem", borderRadius: 12, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#FCA5A5", fontFamily: FONT, fontSize: "0.8rem", marginBottom: "1rem" }}>
          {err}
        </div>
      )}

      {result && badge && (
        <div style={{
          borderRadius: 16, overflow: "hidden",
          border: "1px solid var(--border-strong)",
          background: "var(--surface-raised)",
        }}>
          <div style={{
            padding: "0.85rem 1.15rem",
            background: badge.bg,
            color: "#fff",
            fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800,
            letterSpacing: "0.06em",
          }}>
            {badge.label}
          </div>

          <div style={{ padding: "1.15rem 1.25rem" }}>
            {result.entity_label && (
              <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                {result.entity_label}
              </div>
            )}
            {result.did && (
              <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.75rem", wordBreak: "break-all" }}>
                {result.did}
              </div>
            )}

            <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
              {result.notice}
            </p>

            {result.revocation_reason_code && (
              <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "#FCA5A5", marginBottom: "1rem" }}>
                Reason: {result.revocation_reason_code}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.65rem", marginBottom: "1.25rem" }}>
              {[
                ["Type", result.resolved_type],
                ["Asset class", result.asset_class ?? "—"],
                ["Pipeline stage", result.current_pipeline_stage ?? "—"],
                ["Assurance level", result.assurance_level ? `L${result.assurance_level}` : "—"],
                ["Issued", result.issuance_timestamp ? new Date(result.issuance_timestamp).toLocaleString() : "—"],
                ["Last sync", result.last_sync_timestamp ? new Date(result.last_sync_timestamp).toLocaleString() : "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "0.65rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-primary)", wordBreak: "break-word" }}>{v}</div>
                </div>
              ))}
            </div>

            {Object.keys(taxonomy).length > 0 && (
              <>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "#10B981", marginBottom: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Assurance taxonomy
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Layer", "Target", "Status", "Authority"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ASSURANCE_LEVELS.map(level => {
                        const key = level.level === 1 ? "L1_IdentityClaim"
                          : level.level === 2 ? "L2_LegalReview"
                          : level.level === 3 ? "L3_ProfessionalAttestation"
                          : "L4_ActiveMonitoring";
                        const row = taxonomy[key as keyof typeof taxonomy];
                        if (!row) return null;
                        const status = row.status ?? "—";
                        const authority = "provider" in row ? row.provider
                          : "authority" in row ? row.authority
                          : "oracleSource" in row ? row.oracleSource
                          : "—";
                        return (
                          <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "0.5rem", color: "var(--text-primary)", fontWeight: 600 }}>{level.shortLabel}</td>
                            <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>{level.definition.slice(0, 48)}…</td>
                            <td style={{ padding: "0.5rem", color: status === "VERIFIED" || status === "ACTIVE" ? "#10B981" : "var(--text-muted)" }}>{status}</td>
                            <td style={{ padding: "0.5rem", color: "var(--text-muted)", fontFamily: MONO, fontSize: "0.65rem" }}>{authority ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {result.metadata_uri && (
              <div style={{ marginTop: "1rem" }}>
                <a href={result.metadata_uri.startsWith("/") ? result.metadata_uri : result.metadata_uri}
                  style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#10B981", textDecoration: "none", fontWeight: 600 }}>
                  View asset dossier →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !loading && !err && (
        <div style={{
          padding: "2rem", textAlign: "center", borderRadius: 16,
          border: "1px dashed var(--border)", color: "var(--text-muted)",
          fontFamily: FONT, fontSize: "0.82rem", lineHeight: 1.6,
        }}>
          Try <code style={{ fontFamily: MONO, color: "#10B981" }}>ABX-RE-HOSP-001</code> for Cielo Sunrise,
          or paste a Sui address from <a href="/passport" style={{ color: "#10B981" }}>/passport</a>.
        </div>
      )}
    </div>
  );
}
