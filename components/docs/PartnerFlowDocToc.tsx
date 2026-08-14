"use client";
// FILE: components/docs/PartnerFlowDocToc.tsx
// Sticky table of contents for Partner Flow docs.

import Link from "next/link";
import { PARTNER_FLOW_FIRST_TASKS } from "@/lib/integrate/partnerJourney";
import { PARTNER_FLOW_CONFORMANCE_COMMAND } from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export const PARTNER_FLOW_DOC_SECTIONS = [
  { id: "start-here", label: "Start here" },
  { id: "choose-path", label: "Choose path" },
  { id: "entry-url", label: "Entry URL" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "callback", label: "Callback params" },
  { id: "receipt-verification", label: "Receipt verification" },
  { id: "auth-boundary", label: "Auth boundary" },
  { id: "errors", label: "Errors" },
  { id: "redirect-example", label: "Redirect example" },
  { id: "provisioning", label: "Provisioning" },
] as const;

export function PartnerFlowStartHereCard() {
  return (
    <section
      id="start-here"
      style={{
        marginBottom: "1.25rem",
        padding: "1rem 1.1rem",
        borderRadius: 16,
        border: `1px solid ${ACCENT}44`,
        background: `${ACCENT}10`,
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em", color: ACCENT, marginBottom: 6 }}>
        PARTNER FLOW · START HERE
      </div>
      <h2 style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
        First integration tasks
      </h2>
      <ol style={{ margin: "0 0 0.85rem", paddingLeft: "1.15rem", fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
        {PARTNER_FLOW_FIRST_TASKS.map((task) => (
          <li key={task} style={{ marginBottom: 4 }}>{task}</li>
        ))}
      </ol>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 0.65rem" }}>
        <strong style={{ color: "var(--text-secondary)" }}>Sandbox limitation:</strong> sandbox policies and test credentials are operator-provisioned after approval.
        Production-usable receipts require production policy context — no self-serve production access.
      </p>
      <pre
        style={{
          fontFamily: MONO,
          fontSize: "0.62rem",
          lineHeight: 1.5,
          padding: "0.75rem",
          borderRadius: 10,
          overflow: "auto",
          background: "var(--surface-inset)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        {PARTNER_FLOW_CONFORMANCE_COMMAND}
      </pre>
    </section>
  );
}

export function PartnerFlowDocToc() {
  return (
    <nav
      aria-label="Partner Flow table of contents"
      className="partner-flow-doc-toc"
      style={{
        position: "sticky",
        top: "5.5rem",
        alignSelf: "start",
        padding: "0.85rem 1rem",
        borderRadius: 14,
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        maxHeight: "calc(100vh - 7rem)",
        overflowY: "auto",
      }}
    >
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.55rem" }}>
        On this page
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.3rem" }}>
        {PARTNER_FLOW_DOC_SECTIONS.map((section) => (
          <li key={section.id}>
            <Link
              href={`#${section.id}`}
              style={{
                fontFamily: FONT,
                fontSize: "0.74rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
      <style>{`
        @media (max-width: 960px) {
          .partner-flow-doc-toc { display: none; }
        }
      `}</style>
    </nav>
  );
}
