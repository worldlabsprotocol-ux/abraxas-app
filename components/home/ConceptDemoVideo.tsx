"use client";

import type { ComponentType, ReactNode } from "react";
import { EliteDemoSlideshow } from "@/components/home/elite/EliteDemoSlideshow";
import type { EliteDemoConfig } from "@/lib/eliteDemoSlides";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type DemoProps = { compact?: boolean };

/** @deprecated Prefer EliteConceptDemo with slide config */
export function ConceptDemoVideo({
  demo: Demo,
  compact = false,
  id,
}: {
  demo: ComponentType<DemoProps>;
  compact?: boolean;
  id?: string;
}) {
  return (
    <div id={id} style={{ margin: compact ? "0.85rem 0 1rem" : "1rem 0 1.25rem" }}>
      <Demo compact={compact} />
    </div>
  );
}

/** Premium elite slideshow — site-wide demo standard */
export function EliteConceptDemo({
  config,
  compact = false,
  id,
}: {
  config: EliteDemoConfig;
  compact?: boolean;
  id?: string;
}) {
  return (
    <div id={id} style={{ margin: compact ? "0.85rem 0 1rem" : "1rem 0 1.25rem" }}>
      <EliteDemoSlideshow config={config} compact={compact} />
    </div>
  );
}

export function ConceptDemoLead({
  eyebrow,
  title,
  body,
  compact = false,
  headingId,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  compact?: boolean;
  headingId?: string;
}) {
  return (
    <div style={{ marginBottom: compact ? "0.65rem" : "0.85rem" }}>
      {eyebrow && (
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          {eyebrow}
        </div>
      )}
      <h2
        id={headingId}
        style={{
          fontFamily: FONT,
          fontSize: compact ? "var(--fs-h3, 1.15rem)" : "var(--fs-h2)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          margin: "0 0 0.45rem",
          maxWidth: 560,
        }}
      >
        {title}
      </h2>
      {body && (
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: 0,
            maxWidth: 620,
          }}
        >
          {body}
        </p>
      )}
    </div>
  );
}
