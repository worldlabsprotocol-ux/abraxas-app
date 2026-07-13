"use client";
// FILE: components/portal/OwnerPortalStatusPanel.tsx
// Track external asset application — owner stays in the loop after submit.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApplicationLifecycle } from "@/lib/portal/applicationStatus";
import {
  buildApplicationLifecycle,
  sanitizeApplicationForOwner,
} from "@/lib/portal/applicationStatus";
import { findLocalPortalApplication } from "@/lib/portal/localApplications";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

interface OwnerApplication {
  application_id: string;
  asset_name: string;
  asset_class: string;
  jurisdiction: string | null;
  evidence_scope: string | null;
  status: string;
  public_verify_slug: string | null;
  created_at: string | null;
}

export function OwnerPortalStatusPanel({
  initialApplicationId,
  initialEmail,
}: {
  initialApplicationId?: string;
  initialEmail?: string;
}) {
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [application, setApplication] = useState<OwnerApplication | null>(null);
  const [lifecycle, setLifecycle] = useState<ApplicationLifecycle | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!initialApplicationId) return;
    fetch(`/api/portal/status?application_id=${encodeURIComponent(initialApplicationId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setApplicationId(initialApplicationId);
      })
      .catch(() => null);
  }, [initialApplicationId]);

  useEffect(() => {
    if (!initialApplicationId || !initialEmail || application) return;
    void lookupWith(initialApplicationId, initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-lookup once on deep link
  }, [initialApplicationId, initialEmail]);

  async function lookupWith(id: string, mail: string) {
    setBusy(true);
    setErr(null);
    try {
      if (id.startsWith("local-")) {
        const local = findLocalPortalApplication(id, mail);
        if (!local) {
          throw new Error(
            "Local application not found in this browser. Use the same device where you submitted, or ask Abraxas for your reference ID.",
          );
        }
        const row = {
          id: local.application_id,
          status: local.status,
          asset_name: local.asset_name,
          asset_class: local.asset_class,
          jurisdiction: local.jurisdiction ?? null,
          evidence_scope: local.evidence_scope ?? null,
          created_at: local.created_at,
        };
        setApplication(sanitizeApplicationForOwner(row));
        setLifecycle(buildApplicationLifecycle(id, row));
        setIsDemo(false);
        return;
      }

      const res = await fetch("/api/portal/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: id.trim(), email: mail.trim() }),
      });
      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        application?: OwnerApplication;
        lifecycle?: ApplicationLifecycle;
        is_demo_sample?: boolean;
      };
      if (!res.ok || !data.ok || !data.application || !data.lifecycle) {
        throw new Error(data.error ?? "Could not load application");
      }
      setApplication(data.application);
      setLifecycle(data.lifecycle);
      setIsDemo(Boolean(data.is_demo_sample));
    } catch (e: unknown) {
      setApplication(null);
      setLifecycle(null);
      setErr(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  async function lookup() {
    if (!applicationId.trim() || !email.trim()) {
      setErr("Enter your application reference and the email used at intake");
      return;
    }
    await lookupWith(applicationId, email);
  }

  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      {!application ? (
        <>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: AMBER,
                         letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            Owner portal · Track your application
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
            Enter the reference from your confirmation email and the contact email on file.
            You stay in the loop — this is not a black-box submission to someone else&apos;s website.
          </p>
          <Field label="Application reference">
            <input value={applicationId} onChange={e => setApplicationId(e.target.value)}
              placeholder="UUID from confirmation…" style={inputStyle} />
          </Field>
          <Field label="Contact email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </Field>
          {err && <Err msg={err} />}
          <button type="button" onClick={() => void lookup()} disabled={busy} style={primaryBtn(busy)}>
            {busy ? "Loading…" : "View status →"}
          </button>
        </>
      ) : lifecycle && (
        <>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                         letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            {application.application_id.slice(0, 8)}… · {application.status.replace(/_/g, " ")}
            {isDemo ? " · DEMO SAMPLE" : ""}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            {application.asset_name}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            {application.asset_class}
            {application.jurisdiction ? ` · ${application.jurisdiction}` : ""}
          </p>

          {application.evidence_scope && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55,
                        margin: "0 0 1rem", padding: "0.55rem 0.65rem", borderRadius: 8,
                        background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--text-secondary)" }}>Evidence scope on file:</strong>{" "}
              {application.evidence_scope}
            </p>
          )}

          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
            {lifecycle.steps.map(step => (
              <div key={step.id} style={{
                display: "flex", gap: "0.65rem", alignItems: "flex-start",
                padding: "0.55rem 0.65rem", borderRadius: 10,
                background: step.current ? `${AMBER}10` : step.complete ? `${ACCENT}08` : "transparent",
                border: `1px solid ${step.current ? `${AMBER}44` : step.complete ? `${ACCENT}33` : "var(--border)"}`,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  background: step.complete ? ACCENT : step.current ? AMBER : "var(--border)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.55rem", color: "#000", fontWeight: 800,
                }}>
                  {step.complete ? "✓" : step.current ? "●" : ""}
                </span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700 }}>{step.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {lifecycle.verify_url && (
              <Link href={lifecycle.verify_url} style={ctaBtn(ACCENT, "#000")}>
                Public verify record →
              </Link>
            )}
            <Link href="/case-studies/cielo" style={ctaBtn("transparent", ACCENT, ACCENT)}>
              See Cielo reference loop →
            </Link>
            <button type="button" onClick={() => { setApplication(null); setLifecycle(null); setErr(null); }}
              style={ctaBtn("transparent", "var(--text-muted)", "var(--border)")}>
              Look up another
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.65rem" }}>
      <label style={{ fontFamily: MONO, fontSize: "0.55rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div style={{ color: "#EF4444", fontFamily: FONT, fontSize: "0.72rem", marginBottom: "0.5rem" }}>{msg}</div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.65rem", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface-raised)",
  color: "var(--text-primary)", fontFamily: FONT, fontSize: "0.82rem", boxSizing: "border-box",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "0.65rem", borderRadius: 999, border: "none",
    background: disabled ? `${ACCENT}55` : ACCENT, color: "#000",
    fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, cursor: disabled ? "wait" : "pointer",
  };
}

function ctaBtn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    padding: "0.55rem 1rem", borderRadius: 999, textDecoration: "none",
    background: bg, color, border: border ? `1px solid ${border}` : "none",
    fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
  };
}
