"use client";

import type { ReactNode } from "react";

export interface PremiumHomeChapterProps {
  index: string;
  label: string;
  id?: string;
  children: ReactNode;
  bleed?: boolean;
}

/** Editorial chapter wrapper — asymmetric rail + content column. */
export function PremiumHomeChapter({ index, label, id, children, bleed = false }: PremiumHomeChapterProps) {
  return (
    <section
      id={id}
      className={`abx-premium-chapter${bleed ? " abx-premium-chapter--bleed" : ""}`}
      aria-labelledby={id ? `${id}-heading` : undefined}
    >
      <div className="abx-premium-chapter__rail" aria-hidden="true">
        <span className="abx-premium-chapter__index">{index}</span>
        <span className="abx-premium-chapter__rule" />
        <span className="abx-premium-chapter__label">{label}</span>
      </div>
      <div className="abx-premium-chapter__body">{children}</div>
    </section>
  );
}
