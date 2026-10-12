"use client";

import type { ReactNode } from "react";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const SECTIONS = [
  { id: "assurance", label: "Identity assurance" },
  { id: "credentials", label: "Reusable credentials" },
  { id: "requests", label: "Authorization requests" },
  { id: "consent", label: "Disclosures & consent" },
  { id: "receipts", label: "Receipt validity" },
  { id: "partners", label: "Partner access" },
  { id: "controls", label: "Revocation & privacy" },
] as const;

export function PassportHolderWorkspace({
  assurance,
  credentials,
  requests,
  consent,
  receipts,
  partners,
  controls,
}: {
  assurance: ReactNode;
  credentials: ReactNode;
  requests: ReactNode;
  consent: ReactNode;
  receipts: ReactNode;
  partners: ReactNode;
  controls: ReactNode;
}) {
  const slots: Record<(typeof SECTIONS)[number]["id"], ReactNode> = {
    assurance,
    credentials,
    requests,
    consent,
    receipts,
    partners,
    controls,
  };

  return (
    <div className="abx-passport-workspace">
      <nav className="abx-passport-workspace__nav" aria-label="Holder workspace sections">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#passport-${section.id}`} className="abx-passport-workspace__nav-item">
            {section.label}
          </a>
        ))}
      </nav>
      <div className="abx-passport-workspace__main">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={`passport-${section.id}`}
            className="abx-passport-workspace__section"
            aria-labelledby={`passport-${section.id}-heading`}
          >
            <h2
              id={`passport-${section.id}-heading`}
              style={{
                fontFamily: FONT,
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
                margin: "0 0 0.65rem",
              }}
            >
              {section.label}
            </h2>
            {slots[section.id]}
          </section>
        ))}
      </div>
    </div>
  );
}
