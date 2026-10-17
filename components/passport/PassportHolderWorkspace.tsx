"use client";

import { useId, useState, type ReactNode } from "react";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const PRIMARY_SECTIONS = [
  { id: "security", label: "Account security" },
  { id: "verification", label: "Verification status" },
  { id: "credentials", label: "Your credentials" },
  { id: "requests", label: "Partner requests" },
] as const;

function SectionShell({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      id={`passport-${id}`}
      className="abx-passport-workspace__section"
      aria-labelledby={`passport-${id}-heading`}
    >
      <h2
        id={`passport-${id}-heading`}
        style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          margin: "0 0 0.65rem",
        }}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

export function PassportHolderWorkspace({
  security,
  verification,
  credentials,
  requests,
  advanced,
}: {
  security: ReactNode;
  verification: ReactNode;
  credentials: ReactNode;
  requests: ReactNode;
  advanced: ReactNode;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedPanelId = useId();

  const slots: Record<(typeof PRIMARY_SECTIONS)[number]["id"], ReactNode> = {
    security,
    verification,
    credentials,
    requests,
  };

  return (
    <div className="abx-passport-workspace">
      <nav className="abx-passport-workspace__nav" aria-label="Passport overview">
        {PRIMARY_SECTIONS.map((section) => (
          <a key={section.id} href={`#passport-${section.id}`} className="abx-passport-workspace__nav-item">
            {section.label}
          </a>
        ))}
        <button
          type="button"
          className="abx-passport-workspace__nav-item"
          aria-expanded={advancedOpen}
          aria-controls={advancedPanelId}
          onClick={() => setAdvancedOpen((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            font: "inherit",
            color: "inherit",
            padding: 0,
            textAlign: "left",
          }}
        >
          More controls
        </button>
      </nav>
      <div className="abx-passport-workspace__main">
        {PRIMARY_SECTIONS.map((section) => (
          <SectionShell key={section.id} id={section.id} label={section.label}>
            {slots[section.id]}
          </SectionShell>
        ))}
        <section
          id="passport-advanced"
          className="abx-passport-workspace__section"
          aria-labelledby="passport-advanced-heading"
        >
          <button
            type="button"
            id="passport-advanced-heading"
            aria-expanded={advancedOpen}
            aria-controls={advancedPanelId}
            onClick={() => setAdvancedOpen((v) => !v)}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              margin: "0 0 0.65rem",
            }}
          >
            <span>Consent, receipts, and privacy</span>
            <span aria-hidden="true">{advancedOpen ? "−" : "+"}</span>
          </button>
          {advancedOpen ? (
            <div id={advancedPanelId}>{advanced}</div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
