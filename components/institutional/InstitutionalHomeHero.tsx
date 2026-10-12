"use client";

import Link from "next/link";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { Btn } from "@/components/redesign/ui";
import {
  INSTITUTIONAL_HOME_DEFINITION,
  INSTITUTIONAL_HOME_LEAD,
  INSTITUTIONAL_HOME_TITLE,
  INSTITUTIONAL_HOME_EYEBROW,
  INSTITUTIONAL_DEVNET_DISCLAIMER,
} from "@/lib/home/institutionalHomeCopy";
import {
  SIMPLIFIED_HOME_CTA_PRIMARY,
  SIMPLIFIED_HOME_CTA_PRIMARY_HREF,
  SIMPLIFIED_HOME_CTA_SECONDARY,
  SIMPLIFIED_HOME_CTA_SECONDARY_HREF,
} from "@/lib/home/simplifiedHomeCopy";
import { ABX_FONT_SANS, ABX_SPACING, ABX_TYPOGRAPHY } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

export function InstitutionalHomeHero() {
  return (
    <section className="abx-institutional-hero" aria-label="Abraxas product definition">
      <AbxPageHeader
        eyebrow={INSTITUTIONAL_HOME_EYEBROW}
        title={INSTITUTIONAL_HOME_TITLE}
        lead={INSTITUTIONAL_HOME_LEAD}
        accent="neutral"
        align="left"
      >
        <div
          className="abx-institutional-hero__actions"
          style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "0.35rem" }}
        >
          <Btn href={SIMPLIFIED_HOME_CTA_PRIMARY_HREF} size="md">
            {SIMPLIFIED_HOME_CTA_PRIMARY}
          </Btn>
          <Btn href={SIMPLIFIED_HOME_CTA_SECONDARY_HREF} variant="secondary" size="md">
            {SIMPLIFIED_HOME_CTA_SECONDARY}
          </Btn>
          <Link
            href="/docs/partner-flow"
            style={{
              fontFamily: FONT,
              fontSize: ABX_TYPOGRAPHY.small.fontSize,
              color: "var(--text-muted)",
              alignSelf: "center",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Read Partner Flow
          </Link>
        </div>
      </AbxPageHeader>

      <dl
        className="abx-institutional-definition-grid"
        style={{
          display: "grid",
          gap: ABX_SPACING.stackMd,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          margin: 0,
        }}
      >
        {(
          [
            ["What Abraxas is", INSTITUTIONAL_HOME_DEFINITION.what],
            ["What it does", INSTITUTIONAL_HOME_DEFINITION.does],
            ["Why it matters", INSTITUTIONAL_HOME_DEFINITION.why],
          ] as const
        ).map(([term, detail]) => (
          <div
            key={term}
            style={{
              padding: "0.85rem 1rem",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface-inset)",
              textAlign: "left",
            }}
          >
            <dt
              style={{
                margin: 0,
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {term}
            </dt>
            <dd
              style={{
                margin: "0.45rem 0 0",
                fontFamily: FONT,
                fontSize: ABX_TYPOGRAPHY.body.fontSize,
                lineHeight: ABX_TYPOGRAPHY.body.lineHeight,
                color: "var(--text-secondary)",
              }}
            >
              {detail}
            </dd>
          </div>
        ))}
      </dl>

      <p
        style={{
          margin: `${ABX_SPACING.stackMd} 0 0`,
          fontFamily: FONT,
          fontSize: ABX_TYPOGRAPHY.small.fontSize,
          color: "var(--text-muted)",
          textAlign: "left",
          maxWidth: 640,
        }}
      >
        {INSTITUTIONAL_DEVNET_DISCLAIMER}
      </p>
    </section>
  );
}
