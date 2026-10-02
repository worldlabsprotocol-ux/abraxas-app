"use client";
// FILE: components/demo/referenceContentPublisher/ReferencePublisherClient.tsx
// Native publisher compose surface — Abraxas appears only when proof is required.

import { useState } from "react";
import Link from "next/link";
import {
  REFERENCE_PUBLISHER_ROUTE,
  REFERENCE_PUBLISHER_PACK_ID,
} from "@/lib/demo/referenceContentPublisher/contract";
import { articleDraftToDownloadBlob } from "@/lib/demo/referenceContentPublisher/articleFingerprint";

const SANS = "'Inter', system-ui, sans-serif";
const DISPLAY_NAME = "Fieldnotes Publisher";

export function ReferencePublisherClient() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  async function handlePublish() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/demo/reference-publisher/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json() as {
        error?: string;
        verify_url?: string;
        content_hash?: string;
      };
      if (!res.ok) {
        if (data.error === "publisher_not_configured") {
          setConfigured(false);
        }
        throw new Error(data.error ?? "Could not prepare publication.");
      }
      setVerifyUrl(data.verify_url ?? null);
      setContentHash(data.content_hash ?? null);

      const blob = articleDraftToDownloadBlob({ title, body });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "article-draft.txt";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication could not start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #e7e5e4", paddingBottom: "1.25rem" }}>
        <p style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.12em", color: "#78716c", margin: 0 }}>
          REFERENCE PUBLISHER
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0.35rem 0 0", letterSpacing: "-0.02em" }}>
          {DISPLAY_NAME}
        </h1>
        <p style={{ fontFamily: SANS, fontSize: "0.92rem", color: "#57534e", lineHeight: 1.6, margin: "0.75rem 0 0" }}>
          Draft and publish articles. This publication requests provenance information before publishing —
          who created the work, how AI was used, and whether this exact file matches its fingerprint.
        </p>
      </header>

      {!configured ? (
        <section style={{ fontFamily: SANS, background: "#fff", border: "1px solid #e7e5e4", borderRadius: 12, padding: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>Configure sandbox publisher</h2>
          <p style={{ fontSize: "0.88rem", color: "#57534e", lineHeight: 1.6, margin: 0 }}>
            Create a sandbox app for{" "}
            <code>{REFERENCE_PUBLISHER_PACK_ID}</code> in{" "}
            <Link href={`/developers/integration-studio?pack=${REFERENCE_PUBLISHER_PACK_ID}&path=hosted_partner_flow`}>
              Integration Studio
            </Link>
            , allowlist{" "}
            <code>/demo/reference-publisher/callback</code>, then set{" "}
            <code>REFERENCE_PUBLISHER_PARTNER_ID</code>,{" "}
            <code>REFERENCE_PUBLISHER_POLICY_ID</code>, and optional{" "}
            <code>REFERENCE_PUBLISHER_APP_SLUG</code>.
          </p>
        </section>
      ) : (
        <>
          <section style={{ display: "grid", gap: "1rem" }}>
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontFamily: SANS, fontSize: "0.78rem", fontWeight: 600, color: "#44403c" }}>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Working title"
                style={{
                  fontFamily: SANS,
                  fontSize: "1rem",
                  padding: "0.75rem 0.85rem",
                  borderRadius: 10,
                  border: "1px solid #d6d3d1",
                  background: "#fff",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontFamily: SANS, fontSize: "0.78rem", fontWeight: 600, color: "#44403c" }}>Body</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder="Write your article…"
                style={{
                  fontFamily: SANS,
                  fontSize: "0.95rem",
                  lineHeight: 1.65,
                  padding: "0.85rem",
                  borderRadius: 10,
                  border: "1px solid #d6d3d1",
                  background: "#fff",
                  resize: "vertical",
                }}
              />
            </label>
          </section>

          <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              disabled={busy || !title.trim() || !body.trim()}
              onClick={() => void handlePublish()}
              style={{
                fontFamily: SANS,
                fontSize: "0.92rem",
                fontWeight: 700,
                padding: "0.75rem 1.25rem",
                borderRadius: 999,
                border: "none",
                background: "#1c1917",
                color: "#fafaf9",
                cursor: busy ? "wait" : "pointer",
                opacity: busy || !title.trim() || !body.trim() ? 0.55 : 1,
              }}
            >
              {busy ? "Preparing…" : "Publish article"}
            </button>
            {verifyUrl ? (
              <a
                href={verifyUrl}
                style={{
                  fontFamily: SANS,
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "#0f766e",
                  textDecoration: "none",
                }}
              >
                Continue to provenance proof →
              </a>
            ) : null}
          </div>

          {contentHash ? (
            <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "#78716c", marginTop: "1rem" }}>
              Article fingerprint bound for this publish attempt. Upload the downloaded{" "}
              <strong>article-draft.txt</strong> when Abraxas asks for your artifact.
            </p>
          ) : null}

          {error ? (
            <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "#b91c1c", marginTop: "1rem" }}>{error}</p>
          ) : null}
        </>
      )}

      <footer style={{ marginTop: "3rem", fontFamily: SANS, fontSize: "0.72rem", color: "#a8a29e" }}>
        Demo relying application at <code>{REFERENCE_PUBLISHER_ROUTE}</code>. Abraxas verifies provenance; this publisher keeps your draft.
      </footer>
    </main>
  );
}
