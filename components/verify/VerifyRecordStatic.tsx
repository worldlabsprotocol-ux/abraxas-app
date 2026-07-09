// FILE: components/verify/VerifyRecordStatic.tsx
// Server-rendered public record — full proof card for crawlers and no-JS clients.

import Link from "next/link";
import { resolveVerifierQuery } from "@/lib/verifyRegistry";
import { resolveRegistryAsset } from "@/lib/data/registryAssets";
import { CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";
import { CIELO_RECORD_ID } from "@/lib/cielo/verifiedGuestPolicy";
import { getPublicRegistryEvents } from "@/lib/cielo/verifiedRateService";
import { VerifierResultCard } from "./VerifierResultCard";
import { recordDetailRows, RECORD_DETAIL_FONT, RECORD_DETAIL_MONO } from "@/lib/verify/recordScope";

export async function VerifyRecordStatic({ recordId }: { recordId: string }) {
  const asset = resolveRegistryAsset(recordId);
  const abxId = asset?.abxId ?? recordId.toUpperCase();
  const result = await resolveVerifierQuery(abxId);
  const heroImage = asset?.abxId === "ABX-RE-HOSP-001" ? CIELO_HERO_IMAGE.src : asset?.image;
  const detailRows = recordDetailRows(result);
  let publicEvents: Array<{ message: string; created_at: string }> = [];
  if (abxId === CIELO_RECORD_ID) {
    try {
      publicEvents = await getPublicRegistryEvents(abxId, 5);
    } catch {
      /* optional when DB unavailable */
    }
  }

  return (
    <article
      aria-labelledby="verify-record-heading"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem) 1.5rem" }}
    >
      <div style={{
        fontFamily: RECORD_DETAIL_MONO,
        fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "#10B981", marginBottom: "0.75rem",
      }}>
        Public registry record
      </div>

      <h1
        id="verify-record-heading"
        style={{
          fontFamily: RECORD_DETAIL_FONT,
          fontSize: "clamp(1.4rem, 3.5vw, 2rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.35rem",
          lineHeight: 1.1,
        }}
      >
        {abxId}
        {result.entity_label ? ` — ${result.entity_label.toUpperCase()}` : ""}
      </h1>

      <p style={{
        fontFamily: RECORD_DETAIL_FONT,
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        margin: "0 0 1.25rem",
        lineHeight: 1.6,
      }}>
        Canonical verification URL. This record is visible without signing in or running JavaScript.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1.25rem", alignItems: "start" }}>
        <div style={{ maxWidth: 520 }}>
          <VerifierResultCard
            result={result}
            previewLabel="Server-rendered · public registry"
            heroImage={heroImage}
          />
        </div>

        <div style={{
          padding: "1rem 1.1rem",
          borderRadius: 16,
          background: "var(--surface-raised)",
          border: "1px solid var(--border-strong)",
        }}>
          <div style={{
            fontFamily: RECORD_DETAIL_MONO,
            fontSize: "0.55rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "0.65rem",
          }}>
            Record facts
          </div>
          <dl style={{ margin: 0, display: "grid", gap: "0.55rem" }}>
            {detailRows.map(([label, value]) => (
              <div key={label}>
                <dt style={{
                  fontFamily: RECORD_DETAIL_MONO,
                  fontSize: "0.48rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}>
                  {label}
                </dt>
                <dd style={{
                  fontFamily: RECORD_DETAIL_FONT,
                  fontSize: "0.76rem",
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.55,
                }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {publicEvents.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{
                fontFamily: RECORD_DETAIL_MONO,
                fontSize: "0.48rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: "0.35rem",
              }}>
                Public activity
              </div>
              {publicEvents.map((ev, i) => (
                <div key={i} style={{
                  fontFamily: RECORD_DETAIL_FONT,
                  fontSize: "0.72rem",
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                  lineHeight: 1.5,
                }}>
                  {ev.message}
                  <span style={{ fontFamily: RECORD_DETAIL_MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginLeft: 6 }}>
                    {new Date(ev.created_at as string).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Link
              href="/verify"
              style={{
                fontFamily: RECORD_DETAIL_FONT,
                fontSize: "0.76rem",
                fontWeight: 600,
                color: "#10B981",
                textDecoration: "none",
              }}
            >
              Open full verifier →
            </Link>
            {result.metadata_uri && (
              <Link
                href={result.metadata_uri.startsWith("/") ? result.metadata_uri : result.metadata_uri}
                style={{
                  fontFamily: RECORD_DETAIL_FONT,
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                Asset dossier →
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
