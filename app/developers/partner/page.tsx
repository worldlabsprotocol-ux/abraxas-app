"use client";
// FILE: app/developers/partner/page.tsx
// Partner dashboard — admin-only. End users never paste API keys in the browser.

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

export default function PartnerDashboardPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  async function verifyPin() {
    setError("");
    try {
      const res = await fetch("/api/admin/partner-keys", {
        headers: { "x-admin-pin": pin },
      });
      if (!res.ok) throw new Error("Invalid admin PIN");
      setUnlocked(true);
    } catch {
      setError("Access restricted — valid admin PIN required.");
      setUnlocked(false);
    }
  }

  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow="Developers · Restricted"
        title="Partner dashboard"
        subtitle="Approved partners integrate server-side with issued API keys. End-user flows (Passport, Cielo, Verify) never expose or request partner keys."
      />

      {!unlocked ? (
        <ContentCard title="Admin access required">
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
            Partner API keys are issued at{" "}
            <Link href="/admin/partners" style={{ color: ACCENT, fontWeight: 600 }}>/admin/partners</Link>{" "}
            and used from your backend only — never in the browser for guest flows.
          </p>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Admin PIN"
              style={{
                flex: "1 1 200px",
                padding: "0.6rem 0.75rem",
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-inset)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.82rem",
              }}
            />
            <button
              type="button"
              onClick={() => void verifyPin()}
              style={{
                padding: "0.6rem 1.1rem",
                borderRadius: 10,
                border: "none",
                background: ACCENT,
                color: "#04130C",
                fontFamily: FONT,
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Unlock
            </button>
          </div>
          {error && (
            <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#EF4444", margin: "0.65rem 0 0" }}>{error}</p>
          )}
        </ContentCard>
      ) : (
        <ContentCard title="Partner operations">
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
            Issue and revoke keys, register partner orgs, and review usage from the admin console.
            Server integrations use <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>Authorization: Bearer …</code>{" "}
            on <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>POST /api/credentials/verify</code> — keys never ship to end-user browsers.
          </p>
          <Link
            href="/admin/partners"
            style={{
              display: "inline-block",
              padding: "0.6rem 1.1rem",
              borderRadius: 999,
              background: ACCENT,
              color: "#04130C",
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Open partner admin →
          </Link>
        </ContentCard>
      )}

      <ContentCard title="Verification requests (Step 4)">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
          Create consent URLs server-side with{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>POST /api/v1/verification-requests</code>.
          Holders approve at the returned <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>consent_url</code> — session-authenticated, no API key in the browser.
        </p>
        <Link
          href="/docs/partner-verification-requests"
          style={{
            display: "inline-block",
            fontFamily: FONT,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: ACCENT,
            textDecoration: "none",
          }}
        >
          Partner verification requests guide →
        </Link>
      </ContentCard>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          Cielo verified-rate and Passport use signed browser sessions. The server evaluates{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>cielo-verified-guest-v1</code> internally — guests are never asked for an API key.
        </p>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Link href="/integrations/relying-parties" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
          Integration guide →
        </Link>
        <Link href="/verify/ABX-RE-HOSP-001" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
          Sample record →
        </Link>
      </div>
    </RedesignPage>
  );
}
