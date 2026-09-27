"use client";
// FILE: components/passport/PassportSupportCenter.tsx
// Plain-language holder support and current-device session controls.

import { useState, type FormEvent } from "react";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { Btn } from "@/components/redesign/ui";
import {
  PASSPORT_SUPPORT_ISSUES,
  PASSPORT_SUPPORT_MESSAGE_MAX,
  type PassportSupportIssue,
} from "@/lib/passport/passportSupport";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function PassportSupportCenter() {
  const { session, signOut } = useSuiAuth();
  const [issueType, setIssueType] = useState<PassportSupportIssue>("account_access");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  async function submitSupportRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setReference("");

    try {
      const res = await fetch("/api/passport/support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_type: issueType, message }),
      });
      const data = await res.json() as { error?: string; reference?: string };
      if (!res.ok || !data.reference) {
        setError(data.error ?? "We could not save your request. Try again.");
        return;
      }
      setReference(data.reference);
      setMessage("");
    } catch {
      setError("We could not reach support. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ marginBottom: "2rem" }}>
      <div style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        padding: "1.15rem 1.25rem",
        marginBottom: "1rem",
      }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.55rem",
        }}>
          Get help
        </div>
        <h2 style={{ fontFamily: FONT, fontSize: "1rem", margin: "0 0 0.4rem" }}>
          Tell us what happened
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.6,
          color: "var(--text-secondary)", margin: "0 0 1rem",
        }}>
          This request is connected to your signed-in Passport account automatically.
        </p>

        {reference ? (
          <div role="status" style={{
            padding: "1rem", borderRadius: 12,
            border: "1px solid rgba(16,185,129,0.4)",
            background: "rgba(16,185,129,0.08)",
          }}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.82rem", margin: "0 0 0.35rem", color: ACCENT }}>
              Request saved
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", lineHeight: 1.55, margin: "0 0 0.45rem", color: "var(--text-secondary)" }}>
              Keep this reference if you need to follow up.
            </p>
            <code style={{ fontFamily: MONO, fontSize: "0.78rem", color: "var(--text-primary)" }}>{reference}</code>
            <div style={{ marginTop: "0.85rem" }}>
              <Btn size="sm" variant="secondary" onClick={() => setReference("")}>Send another request</Btn>
            </div>
          </div>
        ) : (
          <form id="passport-support-form" onSubmit={submitSupportRequest}>
            <label htmlFor="passport-support-issue" style={{
              display: "block", fontFamily: FONT, fontSize: "0.72rem",
              fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)",
            }}>
              What do you need help with?
            </label>
            <select
              id="passport-support-issue"
              value={issueType}
              onChange={event => setIssueType(event.target.value as PassportSupportIssue)}
              style={{
                width: "100%", minHeight: 44, padding: "0.65rem 0.75rem",
                borderRadius: 10, border: "1px solid var(--border-strong)",
                background: "var(--surface)", color: "var(--text-primary)",
                fontFamily: FONT, fontSize: "0.78rem", marginBottom: "0.85rem",
              }}
            >
              {PASSPORT_SUPPORT_ISSUES.map(issue => (
                <option key={issue.value} value={issue.value}>{issue.label}</option>
              ))}
            </select>

            <label htmlFor="passport-support-message" style={{
              display: "block", fontFamily: FONT, fontSize: "0.72rem",
              fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)",
            }}>
              What happened?
            </label>
            <textarea
              id="passport-support-message"
              value={message}
              onChange={event => setMessage(event.target.value.slice(0, PASSPORT_SUPPORT_MESSAGE_MAX))}
              minLength={10}
              maxLength={PASSPORT_SUPPORT_MESSAGE_MAX}
              required
              rows={6}
              placeholder="Describe the screen you were on, what you tried, and what you expected to happen."
              style={{
                width: "100%", boxSizing: "border-box", resize: "vertical",
                padding: "0.75rem", borderRadius: 10,
                border: "1px solid var(--border-strong)",
                background: "var(--surface)", color: "var(--text-primary)",
                fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55,
              }}
            />
            <div style={{
              display: "flex", justifyContent: "space-between", gap: "1rem",
              fontFamily: FONT, fontSize: "0.62rem", lineHeight: 1.45,
              color: "var(--text-muted)", margin: "0.35rem 0 0.85rem",
            }}>
              <span>Never paste passwords, API keys, recovery codes, or identity documents.</span>
              <span style={{ whiteSpace: "nowrap" }}>{message.length}/{PASSPORT_SUPPORT_MESSAGE_MAX}</span>
            </div>

            {error && (
              <p role="alert" style={{ fontFamily: FONT, fontSize: "0.7rem", color: "#FCA5A5", margin: "0 0 0.75rem" }}>
                {error}
              </p>
            )}
            <Btn
              size="sm"
              loading={submitting}
              disabled={message.trim().length < 10}
              onClick={() => {
                const form = document.getElementById("passport-support-form") as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            >
              Submit support request
            </Btn>
          </form>
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
          color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.55rem",
        }}>
          Account safety
        </div>
        <h2 style={{ fontFamily: FONT, fontSize: "1rem", margin: "0 0 0.4rem" }}>This device</h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.6,
          color: "var(--text-secondary)", margin: "0 0 0.8rem",
        }}>
          Signed in{session?.email ? ` as ${session.email}` : " to your Passport account"}.
          Sign out when you are finished on a shared device.
        </p>
        {!confirmSignOut ? (
          <Btn size="sm" variant="secondary" onClick={() => setConfirmSignOut(true)}>Sign out of this device</Btn>
        ) : (
          <div style={{
            padding: "0.8rem", borderRadius: 10,
            border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.07)",
          }}>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", lineHeight: 1.5, margin: "0 0 0.65rem", color: "var(--text-secondary)" }}>
              You will need to sign in again to view Passport records or support requests.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Btn size="sm" onClick={signOut}>Confirm sign out</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setConfirmSignOut(false)}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
