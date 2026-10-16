"use client";
// FILE: components/home/defi/AbraxasHeroCenterpiece.tsx
// Official emblem — ambient drift on outer stage, pointer parallax on inner layer.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { OFFICIAL_EMBLEM_HERO_WEBP } from "@/lib/brand/officialBrandAssets";

const PARALLAX_MAX_DEG = 5;

export function AbraxasHeroCenterpiece() {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 8;
    setLowPower(cores <= 2);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion || lowPower || !parallaxRef.current) return;
      const rect = parallaxRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      parallaxRef.current.style.setProperty("--abx-parallax-y", `${(-x * PARALLAX_MAX_DEG).toFixed(2)}deg`);
      parallaxRef.current.style.setProperty("--abx-parallax-x", `${(y * PARALLAX_MAX_DEG).toFixed(2)}deg`);
    },
    [reduceMotion, lowPower],
  );

  const onPointerLeave = useCallback(() => {
    if (!parallaxRef.current) return;
    parallaxRef.current.style.setProperty("--abx-parallax-y", "0deg");
    parallaxRef.current.style.setProperty("--abx-parallax-x", "0deg");
  }, []);

  const staticMode = reduceMotion || lowPower;

  return (
    <div
      className={`abx-hero-emblem-env${staticMode ? " abx-hero-emblem-env--static" : ""}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-hidden="true"
    >
      <div className="abx-hero-emblem-env__floor" />
      <div className="abx-hero-emblem-env__light-cone" />
      <div className="abx-hero-emblem-env__orbit abx-hero-emblem-env__orbit--outer" />
      <div className="abx-hero-emblem-env__orbit abx-hero-emblem-env__orbit--inner" />
      <div className="abx-hero-emblem-env__halo" />
      <div className="abx-hero-emblem-env__stage">
        <div ref={parallaxRef} className="abx-hero-emblem-env__parallax">
          <div className="abx-hero-emblem-env__mark">
            <Image
              src={OFFICIAL_EMBLEM_HERO_WEBP.src}
              alt=""
              width={OFFICIAL_EMBLEM_HERO_WEBP.width}
              height={OFFICIAL_EMBLEM_HERO_WEBP.height}
              priority
              fetchPriority="high"
              sizes="(max-width: 959px) min(88vw, 400px), min(42vw, 520px)"
              className="abx-hero-emblem-env__emblem"
            />
          </div>
          {!staticMode ? <div className="abx-hero-emblem-env__sheen" /> : null}
        </div>
      </div>
      <div className="abx-hero-emblem-env__reflection" aria-hidden="true" />
    </div>
  );
}
