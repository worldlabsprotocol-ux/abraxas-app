"use client";
// FILE: components/verify/PublicVerifierPanel.tsx

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { VerifierResponse } from "@/lib/verifyRegistry";
import { resolveRegistryAsset } from "@/lib/data/registryAssets";
import { NOT_FOUND_VERIFIER_PREVIEW, REVOKED_VERIFIER_PREVIEW } from "@/lib/verifierPreviewSample";
import { CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";
import { VerifierResultCard } from "./VerifierResultCard";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Skeleton } from "@/lib/motion/Skeleton";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function PublicVerifierPanel() {
  const router = useRouter();
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
    const asset = resolveRegistryAsset(trimmed);
    if (asset) {
      router.push(`/verify/${encodeURIComponent(asset.abxId)}`);
      return;
    }
    setSampleKind(null);
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

  type SampleKind = "valid" | "not_found" | "revoked" | null;
  const [sampleKind, setSampleKind] = useState<SampleKind>(null);

  function showSample(kind: SampleKind) {
    setSampleKind(kind);
    setResult(null);
    setErr(null);
    if (kind === "valid") {
      setQuery("ABX-RE-HOSP-001");
      void runVerify("ABX-RE-HOSP-001");
      setSampleKind(null);
    }
  }

  const previewResult =
    sampleKind === "not_found" ? NOT_FOUND_VERIFIER_PREVIEW
    : sampleKind === "revoked" ? REVOKED_VERIFIER_PREVIEW
    : null;

  return (
    <div>
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.75rem", alignItems: "stretch" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void runVerify(query); }}
          aria-label="Public record identifier"
          placeholder="Enter a public record ID (e.g. ABX-RE-HOSP-001)"
          style={{
            flex: "1 1 280px", minWidth: 0,
            minHeight: 44,
            padding: "0.85rem 1rem", borderRadius: 12,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-inset)",
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
          Verify record
        </Btn>
      </div>

      <details style={{ marginBottom: "1.25rem" }}>
        <summary style={{
          width: "fit-content",
          color: "var(--text-secondary)",
          fontFamily: FONT,
          fontSize: "0.78rem",
          cursor: "pointer",
        }}>
          Reference examples and test outcomes
        </summary>
        <p style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          lineHeight: 1.55,
          margin: "0.6rem 0",
        }}>
          Historical record examples resolve through the live lookup. Not-found and revoked outcomes below are illustrative test states, not live records.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          <Btn size="sm" onClick={() => showSample("valid")} disabled={loading}>Verify historical Cielo record</Btn>
          <Btn size="sm" variant="secondary" onClick={() => { setQuery("ABX-RE-RES-002"); void runVerify("ABX-RE-RES-002"); }} disabled={loading}>Verify historical Smyrna record</Btn>
          <Btn size="sm" variant="secondary" onClick={() => showSample("not_found")} disabled={loading}>Not-found test state</Btn>
          <Btn size="sm" variant="tertiary" onClick={() => showSample("revoked")} disabled={loading}>Revoked test state</Btn>
          <Btn href="/verify?mode=credential" variant="ghost" size="sm">Policy gate reference</Btn>
        </div>
      </details>

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

      {result && !loading && result.state === "NULL_STATE" && (
        <div style={{ marginBottom: "1rem" }}>
          <StatusBanner tone="error" title="Not found">
            No active Abraxas record for this identifier.
          </StatusBanner>
        </div>
      )}

      {result && !loading && result.state === "RESOLVED_REVOKED" && (
        <div style={{ marginBottom: "1rem" }}>
          <StatusBanner tone="error" title="Revoked or expired">
            This record is not eligible for gated actions. Fail closed.
          </StatusBanner>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: "1.25rem",
        alignItems: "start",
      }}>
        {result && !loading && (
          <VerifierResultCard
            result={result}
            heroImage={result.entity_label?.includes("Cielo") ? CIELO_HERO_IMAGE.src : undefined}
          />
        )}

        {previewResult && !result && !loading && (
          <VerifierResultCard
            result={previewResult}
            previewLabel={
              sampleKind === "not_found" ? "Demo · record not found"
              : "Demo · revoked / expired credential"
            }
            compact
          />
        )}

        {!result && !loading && !previewResult && !err && (
          <p style={{
            padding: "1rem",
            borderRadius: 12,
            border: "1px dashed var(--border)",
            color: "var(--text-muted)",
            fontFamily: FONT,
            fontSize: "0.82rem",
            lineHeight: 1.6,
            margin: 0,
          }}>
            Enter a public record ID to check its signature, issuer, and current validity.
          </p>
        )}
      </div>
    </div>
  );
}
