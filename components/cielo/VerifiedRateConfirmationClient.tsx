"use client";
// FILE: components/cielo/VerifiedRateConfirmationClient.tsx
// User-facing verified-rate request status (session ownership required).

import { useEffect, useState } from "react";
import Link from "next/link";
import { VERIFIED_RATE_DISCLAIMER } from "@/lib/cielo/verifiedRateLabels";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface RequestStatus {
  public_reference: string;
  status: string;
  status_label: string;
  disclaimer: string;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  timeline: { status_label: string; at: string }[];
}

export function VerifiedRateConfirmationClient({ refCode }: { refCode: string }) {
  const [data, setData] = useState<RequestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cielo/verified-rate/request?ref=${encodeURIComponent(refCode)}`, {
          credentials: "include",
        });
        const json = await res.json() as RequestStatus & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load request status");
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load request status");
      } finally {
        setLoading(false);
      }
    })();
  }, [refCode]);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 3vw, 2rem)", textAlign: "center" }}>
      <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, color: ACCENT, marginBottom: "0.5rem" }}>
        {loading ? "Loading…" : data?.status_label ?? "Verified-rate request"}
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
        {data?.disclaimer ?? VERIFIED_RATE_DISCLAIMER}
      </p>

      <div style={{
        fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-primary)",
        padding: "0.75rem", borderRadius: 12, background: "var(--surface-inset)",
        border: "1px solid var(--border)", marginBottom: "1rem",
      }}>
        Reference: {refCode}
      </div>

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#EF4444", marginBottom: "1rem", lineHeight: 1.6 }}>
          {error}
          {error.includes("session") || error.includes("Forbidden") ? (
            <> Sign in with the Passport account that submitted this request.</>
          ) : null}
        </p>
      )}

      {data && (
        <>
          {data.check_in && data.check_out && (
            <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Requested dates: {data.check_in} → {data.check_out}
              {data.guests != null ? ` · ${data.guests} guests` : ""}
            </p>
          )}

          {data.timeline.length > 0 && (
            <div style={{
              textAlign: "left", padding: "0.85rem 1rem", borderRadius: 12,
              background: "var(--surface-inset)", border: "1px solid var(--border)", marginBottom: "1.25rem",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Status timeline
              </div>
              {data.timeline.map((t, i) => (
                <div key={i} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, padding: "0.2rem 0" }}>
                  {new Date(t.at).toLocaleString()} · {t.status_label}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
        <Link href="/verify/ABX-RE-HOSP-001" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
          View public record →
        </Link>
        <Link href="/flagship" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textDecoration: "none" }}>
          Back to Cielo
        </Link>
      </div>
    </div>
  );
}
