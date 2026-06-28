"use client";
// FILE: lib/motion/AnimatedCounter.tsx
// Smooth count-up for numeric values. Accepts the same display strings
// the app already uses ("$1,100,000", "14.6%", "94 / 100", "$660K USDC")
// and animates only the first numeric token while preserving its
// prefix, suffix, decimal places and thousands grouping. Non-numeric
// strings ("W3C") render as-is. Animates the first time it scrolls into
// view; updates smoothly when the target value changes.

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

export function AnimatedCounter({ value, duration = 1.2, style, className }: AnimatedCounterProps) {
  const str = typeof value === "number" ? String(value) : value;
  const parsed = parse(str);
  const reduce = useReducedMotion();

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(() =>
    parsed && !reduce ? `${parsed.prefix}${(0).toFixed(parsed.decimals)}${parsed.suffix}` : str
  );

  useEffect(() => {
    if (!parsed) {
      setDisplay(str);
      return;
    }
    if (reduce || !inView) {
      if (reduce) setDisplay(str);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [str, inView, reduce]);

  return (
    <span ref={ref} style={style} className={className}>
      {display}
    </span>
  );
}
