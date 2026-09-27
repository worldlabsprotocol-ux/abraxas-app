"use client";
// FILE: components/passport/PassportRequestInbox.tsx
// Plain-language inbox for pending partner verification requests.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { PassportRequestInboxItem } from "@/lib/passport/passportRequestInbox";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

async function fetchRequests(): Promise<PassportRequestInboxItem[]> {
  const response = await fetch("/api/passport/requests", { credentials: "include" });
  const body = await response.json().catch(() => ({})) as {
    requests?: PassportRequestInboxItem[];
    error?: string;
  };
  if (!response.ok) throw new Error(body.error ?? "Partner requests are temporarily unavailable.");
  return Array.isArray(body.requests) ? body.requests : [];
}

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Expiry unavailable";
  return `Expires ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

export function PassportRequestInbox() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["passport", "request-inbox"],
    queryFn: fetchRequests,
    staleTime: 15_000,
    retry: false,
  });

  if (!isLoading && !isError && (data?.length ?? 0) === 0) return null;

  return (
    <section
      aria-labelledby="passport-request-inbox-heading"
      style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: PUBLIC_SURFACE.cardBorder,
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.7rem",
        fontWeight: 800,
        color: "#FBBF24",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        margin: "0 0 0.35rem",
      }}>
        Needs your review
      </p>
      <h2 id="passport-request-inbox-heading" style={{
        fontFamily: FONT,
        fontSize: "1rem",
        fontWeight: 800,
        margin: "0 0 0.35rem",
      }}>
        Partner requests
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.78rem",
        color: "var(--text-secondary)",
        lineHeight: 1.55,
        margin: "0 0 0.8rem",
      }}>
        Nothing is shared until you open a request and approve it.
      </p>

      {isLoading && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: 0 }}>
          Checking for requests…
        </p>
      )}

      {isError && (
        <div>
          <p role="status" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0 0 0.65rem" }}>
            Partner requests could not be loaded.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            style={{
              padding: "0.4rem 0.7rem",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              color: "var(--text-primary)",
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {data?.map(request => (
            <article key={request.request_ref} style={{
              padding: "0.8rem",
              borderRadius: 12,
              border: "1px solid rgba(251,191,36,0.24)",
              background: "rgba(251,191,36,0.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start" }}>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: ACCENT, margin: "0 0 0.25rem" }}>
                    {request.partner_label}
                  </p>
                  <h3 style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, margin: 0 }}>
                    {request.request_title}
                  </h3>
                </div>
                <span style={{
                  fontFamily: FONT,
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  color: "#FBBF24",
                  whiteSpace: "nowrap",
                }}>
                  Waiting
                </span>
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0.45rem 0 0" }}>
                Why: {request.purpose}
              </p>
              <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-primary)", lineHeight: 1.5, margin: "0.25rem 0 0" }}>
                Would share: {request.shared_result}
              </p>
              <p style={{ fontFamily: FONT, fontSize: "0.66rem", color: "var(--text-muted)", margin: "0.3rem 0 0.65rem" }}>
                {formatExpiry(request.expires_at)}
              </p>
              <Link
                href={request.continue_href}
                style={{
                  display: "inline-flex",
                  minHeight: 38,
                  alignItems: "center",
                  padding: "0 0.75rem",
                  borderRadius: 9,
                  background: ACCENT,
                  color: "#04130C",
                  textDecoration: "none",
                  fontFamily: FONT,
                  fontSize: "0.74rem",
                  fontWeight: 800,
                }}
              >
                Review request →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
