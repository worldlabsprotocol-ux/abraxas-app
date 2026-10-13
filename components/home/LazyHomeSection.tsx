"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface LazyHomeSectionProps {
  children: ReactNode;
  /** Minimum height reserved before hydrate (reduces CLS). */
  minHeight?: string;
  rootMargin?: string;
  id?: string;
  /** Mount immediately (e.g. evidence demo targeted by E2E). */
  eager?: boolean;
}

/** Defers mounting children until near viewport — keeps SEO shell in parent. */
export function LazyHomeSection({
  children,
  minHeight = "12rem",
  rootMargin = "280px 0px",
  id,
  eager = false,
}: LazyHomeSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (eager) return;
    const el = ref.current;
    if (!el || visible) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin, eager]);

  return (
    <div ref={ref} id={id} className="abx-lazy-home-section" style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : null}
    </div>
  );
}
