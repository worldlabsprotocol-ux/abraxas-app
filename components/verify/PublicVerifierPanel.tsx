"use client";
// FILE: components/verify/PublicVerifierPanel.tsx

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { VerifierResponse } from "@/lib/verifyRegistry";
import { CIELO_VERIFIER_PREVIEW } from "@/lib/verifierPreviewSample";
import { VerifierResultCard } from "./VerifierResultCard";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Skeleton } from "@/lib/motion/Skeleton";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

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
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "stretch" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void runVerify(query); }}
          aria-label="Credential or asset identifier to verify"
          placeholder="Paste Passport DID, Sui address, credential JWT, or asset ID (e.g. ABX-RE-HOSP-001)…"
          style={{
            flex: "1 1 280px", minWidth: 0,
            minHeight: 44,
            padding: "0.85rem 1rem", borderRadius: 12,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
            color: "var(--text-primary)",
            fontFamily: MONO, fontSize: "0.78rem",
          }}
        />
        <Btn
          onClick={() => void runVerify(query)}
          disabled={!query.trim()}
          loading={loading}
          ariaLabel="Verify identifier"
        >
          Verify
        </Btn>
        <Btn
          variant="tertiary"
          onClick={() => { setQuery("ABX-RE-HOSP-001"); void runVerify("ABX-RE-HOSP-001"); }}
          disabled={loading}
        >
          Try Cielo example
        </Btn>
      </div>

      {err && (
        <div style={{ marginBottom: "1rem" }}>
          <StatusBanner tone="error" title="Verification failed">
            {err}
          </StatusBanner>
        </div>
      )}

      {loading && (
        <div style={{
          padding: "1.5rem", borderRadius: 16,
          border: "1px solid var(--border)", marginBottom: "1rem",
        }}>
          <StatusBanner tone="pending" title="Resolving registry state…" loading>
            Checking cryptographic integrity and compliance status.
          </StatusBanner>
          <div style={{ display: "grid", gap: 8, marginTop: "1rem" }}>
            <Skeleton width="100%" height={120} />
            <Skeleton width="70%" height={14} />
          </div>
        </div>
      )}

      {result && !loading && result.state === "RESOLVED_VALID" && (
        <div style={{ marginBottom: "1rem" }}>
          <StatusBanner tone="success" title="Verified and active">
            Registry lookup succeeded. Details below.
          </StatusBanner>
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
              Paste any identifier, or click <strong style={{ color: "var(--accent)" }}>Try Cielo example</strong> for a live API response.
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
