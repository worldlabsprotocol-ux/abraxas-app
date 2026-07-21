"use client";

import { useEffect, useRef, useState } from "react";

export function useCinematicTimer(actDurationsMs: number[]) {
  const totalMs = actDurationsMs.reduce((sum, ms) => sum + ms, 0);
  const [elapsed, setElapsed] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold: 0.2, rootMargin: "80px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setElapsed(totalMs - 1);
      return;
    }
    if (!visible) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const next = (now - startRef.current) % totalMs;
      setElapsed(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, visible, totalMs]);

  let act = 1;
  let actStart = 0;
  let actDuration = actDurationsMs[0] ?? totalMs;
  let cursor = 0;

  for (let i = 0; i < actDurationsMs.length; i++) {
    const duration = actDurationsMs[i] ?? 0;
    if (elapsed < cursor + duration) {
      act = i + 1;
      actStart = cursor;
      actDuration = duration;
      break;
    }
    cursor += duration;
    if (i === actDurationsMs.length - 1) {
      act = actDurationsMs.length;
      actStart = cursor - duration;
      actDuration = duration;
    }
  }

  const actLocal = Math.max(0, elapsed - actStart);
  const actProgress = actDuration > 0 ? Math.min(1, actLocal / actDuration) : 0;

  return {
    containerRef,
    elapsed,
    totalMs,
    act,
    actCount: actDurationsMs.length,
    actProgress,
    reducedMotion,
    visible,
  };
}
