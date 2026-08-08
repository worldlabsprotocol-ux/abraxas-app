"use client";
// FILE: components/passport/PassportPrivacyCenter.tsx
// Holder privacy center — data categories, export/deletion request workflow.

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface DataCategory {
  id: string;
  title: string;
  summary: string;
  partner_exposure: string;
}

interface PrivacyRequest {
  request_ref: string;
  request_type: "data_export" | "account_deletion";
  status: string;
  status_label: string;
  reason_code: string | null;
  created_at: string;
  updated_at: string;
}

interface PrivacyCenterData {
  disclaimer: string;
  data_categories: DataCategory[];
  export_note: string;
  deletion_note: string;
  requests: PrivacyRequest[];
}

async function fetchPrivacyCenter(): Promise<PrivacyCenterData> {
  const res = await fetch("/api/passport/privacy/requests", { credentials: "include" });
  if (!res.ok) throw new Error("Privacy center unavailable");
  return res.json() as Promise<PrivacyCenterData>;
}

async function submitPrivacyRequest(requestType: "data_export" | "account_deletion", idempotencyKey: string) {
  const res = await fetch("/api/passport/privacy/requests", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request_type: requestType, idempotency_key: idempotencyKey }),
  });
  const data = await res.json() as { error?: string; message?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function formatType(type: string): string {
  return type === "data_export" ? "Data export" : "Account / data deletion";
}

export function PassportPrivacyCenter({ suiAddress }: { suiAddress: string | null }) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["passport", "privacy", suiAddress],
    queryFn: fetchPrivacyCenter,
    enabled: Boolean(suiAddress),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: ({ type, key }: { type: "data_export" | "account_deletion"; key: string }) =>
      submitPrivacyRequest(type, key),
    onSuccess: (result) => {
      setActionMessage(result.message ?? "Request submitted.");
      setActionError("");
      void queryClient.invalidateQueries({ queryKey: ["passport", "privacy", suiAddress] });
    },
    onError: (e: Error) => {
      setActionError(e.message);
      setActionMessage("");
    },
  });

  const requestExport = useCallback(() => {
    const key = `export:${suiAddress}:${new Date().toISOString().slice(0, 10)}`;
    mutation.mutate({ type: "data_export", key });
  }, [mutation, suiAddress]);

  const requestDeletion = useCallback(() => {
    const confirmed = window.confirm(
      "Submit an account/data deletion request?\n\n"
      + "This does NOT immediately delete your data. An operator will review the request. "
      + "If approved, Passport access and credentials are revoked first. "
      + "Physical deletion of stored documents requires a separate retention process.",
    );
    if (!confirmed) return;
    const key = `deletion:${suiAddress}:${new Date().toISOString().slice(0, 10)}`;
    mutation.mutate({ type: "account_deletion", key });
  }, [mutation, suiAddress]);

  if (!suiAddress) return null;

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700,
        color: "var(--text-primary)", margin: "0 0 0.5rem",
      }}>
        Your data and privacy
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem",
      }}>
        Abraxas stores verification and consent records so you can reuse proofs with partners.
        Partners receive signed claims — not your raw ID or selfie files.
      </p>

      <div style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        padding: "1.15rem 1.25rem",
        marginBottom: "1rem",
      }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.65rem",
        }}>
          What we hold
        </div>

        {isLoading && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>Loading…</p>
        )}

        {isError && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
            Privacy center requires migration 060 applied.
          </p>
        )}

        {data?.data_categories.map(cat => (
          <div key={cat.id} style={{
            padding: "0.55rem 0.65rem", borderRadius: 10, marginBottom: "0.4rem",
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {cat.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", lineHeight: 1.55 }}>
              {cat.summary}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
              Partners: {cat.partner_exposure}
            </p>
          </div>
        ))}

        {data?.disclaimer && (
          <p style={{
            fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)",
            margin: "0.75rem 0 0", lineHeight: 1.5, fontStyle: "italic",
          }}>
            {data.disclaimer}
          </p>
        )}
      </div>

      <div style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        padding: "1.15rem 1.25rem",
      }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.65rem",
        }}>
          Your requests
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => void requestExport()}
            style={{
              padding: "0.45rem 0.85rem", borderRadius: 8, border: "1px solid var(--border-strong)",
              background: "var(--surface)", color: "var(--text-primary)",
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Request data export
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => void requestDeletion()}
            style={{
              padding: "0.45rem 0.85rem", borderRadius: 8, border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.08)", color: "#FCA5A5",
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Request account / data deletion
          </button>
        </div>

        {data?.export_note && (
          <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: "0 0 0.5rem", lineHeight: 1.5 }}>
            Export: {data.export_note}
          </p>
        )}
        {data?.deletion_note && (
          <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
            Deletion: {data.deletion_note}
          </p>
        )}

        {actionMessage && (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: ACCENT, margin: "0 0 0.5rem" }}>{actionMessage}</p>
        )}
        {actionError && (
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "#FCA5A5", margin: "0 0 0.5rem" }}>{actionError}</p>
        )}

        {!isLoading && !isError && (data?.requests.length ?? 0) === 0 && (
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            No privacy requests yet.
          </p>
        )}

        {data?.requests.map(req => (
          <div key={`${req.request_ref}-${req.created_at}`} style={{
            padding: "0.55rem 0.65rem", borderRadius: 10, marginBottom: "0.4rem",
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {formatType(req.request_type)}
              </span>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                Ref {req.request_ref}
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)", margin: "0.3rem 0 0", lineHeight: 1.5 }}>
              {req.status_label}
            </p>
            <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
              {new Date(req.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
