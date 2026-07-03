"use client";
// FILE: components/verify/PublicVerifierPanel.tsx

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { VerifierResponse } from "@/lib/verifyRegistry";
import { CIELO_VERIFIER_PREVIEW } from "@/lib/verifierPreviewSample";
import { VerifierResultCard } from "./VerifierResultCard";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

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

  const showPreview = !result && !loading && !err;

  return (
    <div>
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
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
            background: loading ? "var(--surface)" : ACCENT,
            color: loading ? "var(--text-muted)" : "#000",
            fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Checking…" : "Verify"}
        </button>
        <button
          type="button"
          onClick={() => { setQuery("ABX-RE-HOSP-001"); void runVerify("ABX-RE-HOSP-001"); }}
          style={{
            padding: "0.85rem 1rem", borderRadius: 12,
            border: "1px solid var(--border)", background: "var(--surface)",
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            color: ACCENT, cursor: "pointer",
          }}
        >
          Try Cielo example
        </button>
      </div>

      {err && (
        <div style={{
          padding: "0.85rem", borderRadius: 12,
          background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
          color: "#FCA5A5", fontFamily: FONT, fontSize: "0.8rem", marginBottom: "1rem",
        }}>
          {err}
        </div>
      )}

      {loading && (
        <div style={{
          padding: "2rem", textAlign: "center", borderRadius: 16,
          border: "1px solid var(--border)", fontFamily: FONT, fontSize: "0.85rem",
          color: "var(--text-muted)", marginBottom: "1rem",
        }}>
          Resolving registry state…
        </div>
      )}

      <div className="verify-results-grid" style={{
        display: "grid",
        gridTemplateColumns: showPreview ? "1fr 1fr" : "1fr",
        gap: "1.25rem",
        alignItems: "start",
      }}>
        {result && !loading && (
          <VerifierResultCard
            result={result}
            heroImage={result.entity_label?.includes("Cielo") ? "/assets/cielo/08.jpg" : undefined}
          />
        )}

        {showPreview && (
          <>
            <div style={{
              padding: "1.25rem", borderRadius: 16,
              border: "1px dashed var(--border)",
              fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)",
              lineHeight: 1.65, display: "flex", flexDirection: "column", justifyContent: "center",
              minHeight: 200,
            }}>
              <div style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Your check runs here
              </div>
              Paste any identifier, or click <strong style={{ color: ACCENT }}>Try Cielo example</strong> for a live API response.
              Relying parties integrate the same endpoint server-side.
            </div>
            <VerifierResultCard
              result={CIELO_VERIFIER_PREVIEW}
              previewLabel="Example · valid credential (Cielo Sunrise)"
              heroImage="/assets/cielo/08.jpg"
              compact
            />
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .verify-results-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
