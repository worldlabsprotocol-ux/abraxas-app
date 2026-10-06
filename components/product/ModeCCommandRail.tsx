"use client";
// FILE: components/product/ModeCCommandRail.tsx
// Mode C operator context — environment, policy, application, readiness, next action.

import type { ReactNode } from "react";
import { ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

export interface ModeCCommandRailItem {
  id: string;
  label: string;
  value: string;
  tone?: "neutral" | "sandbox" | "live" | "ready" | "blocked";
}

export function ModeCCommandRail({
  items,
  nextAction,
}: {
  items: ModeCCommandRailItem[];
  nextAction?: ReactNode;
}) {
  return (
    <div className="abx-mode-c-rail" role="region" aria-label="Integration context">
      <dl className="abx-mode-c-rail__grid">
        {items.map((item) => (
          <div key={item.id} className={`abx-mode-c-rail__cell abx-mode-c-rail__cell--${item.tone ?? "neutral"}`}>
            <dt className="abx-mode-c-rail__label" style={{ fontFamily: ABX_FONT_MONO }}>
              {item.label}
            </dt>
            <dd className="abx-mode-c-rail__value" style={{ fontFamily: ABX_FONT_SANS }}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {nextAction ? (
        <div className="abx-mode-c-rail__next">{nextAction}</div>
      ) : null}
    </div>
  );
}
