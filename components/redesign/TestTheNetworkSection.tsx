"use client";
// FILE: components/redesign/TestTheNetworkSection.tsx
// "Prove it" — test verification without signing in.

import { useState } from "react";
import Link from "next/link";
import { CIELO_VERIFIER_PREVIEW } from "@/lib/verifierPreviewSample";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const SAMPLE_QUERY = "ABX-RE-HOSP-001";

export function TestTheNetworkSection() {
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<typeof CIELO_VERIFIER_PREVIEW | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function runLive() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/verify/registry?q=${encodeURIComponent(SAMPLE_QUERY)}`);
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Lookup failed");
      setLive(data as typeof CIELO_VERIFIER_PREVIEW);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  const preview = live ?? CIELO_VERIFIER_PREVIEW;

  return (
    <section aria-labelledby="test-network-heading" style={{
      padding: "1.35rem 1.25rem",
      borderRadius: 18,
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT,
        }}>
          Test the network
        </div>
        <CapabilityStatusBadge status="live" size="xs" />
      </div>
      <h2 id="test-network-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 0.45rem",
      }}>
        Prove it in one click — no sign-in
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 620, margin: "0 0 1rem",
      }}>
        Run a live registry lookup, inspect issuer attestations, and open the public verifier API path partners use.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "0.85rem",
      }}>
        <div style={{
          padding: "1rem", borderRadius: 14,
          background: "var(--surface-inset)", border: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
            LIVE REGISTRY LOOKUP
          </div>
          <code style={{ fontFamily: MONO, fontSize: "0.75rem", color: ACCENT }}>{SAMPLE_QUERY}</code>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0.65rem 0" }}>
            Cielo Sunrise genesis asset — assurance L{preview.assurance_level}, state {preview.state}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            <Btn onClick={() => void runLive()} loading={loading} size="sm">
              {live ? "Re-run live check" : "Run live check →"}
            </Btn>
            <Btn href={`/verify?q=${SAMPLE_QUERY}`} variant="secondary" size="sm">Open verifier</Btn>
          </div>
          {err && (
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "#EF4444", margin: "0.5rem 0 0" }}>{err}</p>
          )}
        </div>

        <div style={{
          padding: "1rem", borderRadius: 14,
          background: "var(--surface-inset)", border: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
            ISSUER ATTESTATIONS
          </div>
          {preview.assurance_taxonomy && Object.entries(preview.assurance_taxonomy).map(([k, v]) => (
            <div key={k} style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: 4 }}>
              <strong style={{ color: "var(--text-primary)" }}>{k.replace(/_/g, " ")}</strong>
              {" · "}{typeof v === "object" && v && "provider" in v ? String(v.provider) : ""}
              {" · "}{typeof v === "object" && v && "status" in v ? String(v.status) : ""}
            </div>
          ))}
          <Link href="/flagship#verification-scope" style={{
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
          }}>
            Full asset verification scope →
          </Link>
        </div>

        <div style={{
          padding: "1rem", borderRadius: 14,
          background: "var(--surface-inset)", border: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
            API PATHS (PARTNERS)
          </div>
          {[
            { s: "live", path: "GET /api/verify/registry?q=" },
            { s: "live", path: "POST /api/credentials/verify", href: "/verify?mode=credential" },
            { s: "pilot", path: "POST /api/v1/verification-requests" },
            { s: "pilot", path: "GET /api/v1/decisions/{id}/status" },
          ].map(row => (
            <div key={row.path} style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: 6, flexWrap: "wrap" }}>
              <CapabilityStatusBadge status={row.s as "live" | "pilot"} size="xs" />
              {"href" in row && row.href ? (
                <Link href={row.href} style={{ fontFamily: MONO, fontSize: "0.58rem", color: ACCENT, textDecoration: "none" }}>
                  {row.path} →
                </Link>
              ) : (
                <code style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)" }}>{row.path}</code>
              )}
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.35rem" }}>
            <Btn href="/verify?mode=credential" variant="secondary" size="sm">Try credential verify →</Btn>
            <Btn href="/integrations" variant="ghost" size="sm">Integration docs →</Btn>
          </div>
        </div>
      </div>

      {!live && (
        <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
          Preview shown until you run live check. On-chain anchor references appear when configured for the asset.
        </p>
      )}
    </section>
  );
}
