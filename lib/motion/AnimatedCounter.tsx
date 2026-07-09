"use client";
// FILE: lib/motion/AnimatedCounter.tsx
// Smooth count-up for numeric values. Non-numeric and currency-compact strings
// (e.g. "$1.1M+") render statically — never flash "$0.0M+" during load.

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface AnimatedCounterProps {
  value: string | number;
  duration?: number;
  style?: CSSProperties;
  className?: string;
}

const NUM_RE = /([0-9][0-9,]*(?:\.[0-9]+)?)/;

function parse(value: string) {
  const match = value.match(NUM_RE);
  if (!match) return null;
  const raw = match[1];
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  const grouped = raw.includes(",");
  return {
    prefix: value.slice(0, match.index),
    suffix: value.slice((match.index ?? 0) + raw.length),
    target: parseFloat(raw.replace(/,/g, "")),
    decimals,
    grouped,
  };
}

/** Skip animation for currency shorthand and small integers that look bad counting from zero. */
function shouldAnimateStatic(str: string, parsed: NonNullable<ReturnType<typeof parse>>): boolean {
  if (/[MK%+]/.test(parsed.suffix)) return true;
  if (parsed.prefix.includes("$") && parsed.target < 100) return true;
  return false;
}

export function AnimatedCounter({ value, duration = 1.6, style, className }: AnimatedCounterProps) {
  const str = typeof value === "number" ? String(value) : value;
  const parsed = parse(str);
  const reduce = useReducedMotion();
  const staticDisplay = !parsed || shouldAnimateStatic(str, parsed);

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(str);

  useEffect(() => {
    setDisplay(str);
    if (!parsed || reduce || !inView || staticDisplay) return;

    const fmt = (n: number) => {
      const fixed = n.toFixed(parsed.decimals);
      if (!parsed.grouped) return `${parsed.prefix}${fixed}${parsed.suffix}`;
      const [int, dec] = fixed.split(".");
      const grouped = Number(int).toLocaleString("en-US");
      return `${parsed.prefix}${dec ? `${grouped}.${dec}` : grouped}${parsed.suffix}`;
    };

    const controls = animate(0, parsed.target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(fmt(v)),
    });
    return () => controls.stop();
  }, [str, inView, reduce, parsed, staticDisplay, duration]);

  return (
    <span ref={ref} style={style} className={className}>
      {display}
    </span>
  );
}
