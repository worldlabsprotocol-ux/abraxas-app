"use client";
// FILE: components/docs/PartnerFlowDocToc.tsx
// Sticky table of contents for Partner Flow docs.

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  PARTNER_FLOW_CONFORMANCE_COMMAND,
  PARTNER_FLOW_FIRST_TASKS,
  PARTNER_FLOW_MOBILE_RECEIPT_JUMP_LABEL,
  PARTNER_RECEIPT_DOCS_ANCHOR,
} from "@/lib/integrate/partnerJourney";

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
  { id: "planned-passwordless-onboarding", label: "Planned onboarding" },
  { id: "provisioning", label: "Provisioning" },
] as const;

const RECEIPT_SECTION_ID = "receipt-verification";

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
          overflowX: "auto",
          overflowY: "hidden",
          maxWidth: "100%",
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

function sectionPillStyle(highlight: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.45rem 0.75rem",
    borderRadius: 999,
    border: `1px solid ${highlight ? `${ACCENT}88` : "var(--border)"}`,
    background: highlight ? `${ACCENT}14` : "var(--surface-inset)",
    fontFamily: FONT,
    fontSize: "0.72rem",
    fontWeight: highlight ? 700 : 600,
    color: highlight ? ACCENT : "var(--text-secondary)",
    textDecoration: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}

export function PartnerFlowDocMobileJump() {
  return (
    <nav
      aria-label="Partner Flow section navigation"
      className="partner-flow-doc-mobile-jump"
      style={{
        marginBottom: "1rem",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <div
        className="partner-flow-doc-mobile-jump-scroll"
        style={{
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          overflowY: "hidden",
          maxWidth: "100%",
          paddingBottom: "0.25rem",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {PARTNER_FLOW_DOC_SECTIONS.map((section) => {
          const highlight = section.id === RECEIPT_SECTION_ID;
          return (
            <Link
              key={section.id}
              href={`#${section.id}`}
              style={sectionPillStyle(highlight)}
              aria-label={highlight ? PARTNER_FLOW_MOBILE_RECEIPT_JUMP_LABEL : section.label}
            >
              {highlight ? PARTNER_FLOW_MOBILE_RECEIPT_JUMP_LABEL : section.label}
            </Link>
          );
        })}
      </div>
      <style>{`
        @media (min-width: 961px) {
          .partner-flow-doc-mobile-jump { display: none !important; }
        }
        @media (max-width: 960px) {
          .partner-flow-doc-mobile-jump { display: block; }
        }
        .partner-flow-doc-mobile-jump-scroll:focus-within {
          outline: 2px solid ${ACCENT};
          outline-offset: 2px;
          border-radius: 8px;
        }
        .partner-flow-doc-mobile-jump a:focus-visible {
          outline: 2px solid ${ACCENT};
          outline-offset: 2px;
        }
      `}</style>
    </nav>
  );
}

export function PartnerFlowMobileReceiptCallout() {
  return (
    <div
      className="partner-flow-mobile-receipt-callout"
      style={{
        marginBottom: "1.25rem",
        padding: "0.85rem 1rem",
        borderRadius: 14,
        border: `1px solid ${ACCENT}44`,
        background: `${ACCENT}10`,
        maxWidth: "100%",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.78rem",
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        margin: "0 0 0.65rem",
      }}>
        <strong style={{ color: "var(--text-primary)" }}>Server-side receipt check:</strong>{" "}
        Your backend must call{" "}
        <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>GET /api/receipts/{"{receipt_id}"}/public</code>{" "}
        and validate the signed result before granting access. The public receipt tester is a mirror only.
      </p>
      <Link href={PARTNER_RECEIPT_DOCS_ANCHOR} style={{
        fontFamily: FONT,
        fontSize: "0.76rem",
        fontWeight: 700,
        color: ACCENT,
        textDecoration: "none",
      }}>
        Jump to receipt verification docs
      </Link>
      <style>{`
        @media (min-width: 961px) {
          .partner-flow-mobile-receipt-callout { display: none !important; }
        }
      `}</style>
    </div>
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
