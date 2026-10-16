"use client";
// FILE: components/home/defi/AbraxasHeroCenterpiece.tsx
// Official Abraxas emblem — subtle 3D drift, sheen, optional pointer parallax.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { OFFICIAL_EMBLEM_HERO_WEBP } from "@/lib/brand/officialBrandAssets";

const PARALLAX_MAX_DEG = 6;

export function AbraxasHeroCenterpiece() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 8;
    setLowPower(cores <= 4);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion || lowPower || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stageRef.current.style.setProperty("--abx-parallax-y", `${(-x * PARALLAX_MAX_DEG).toFixed(2)}deg`);
      stageRef.current.style.setProperty("--abx-parallax-x", `${(y * PARALLAX_MAX_DEG).toFixed(2)}deg`);
    },
    [reduceMotion, lowPower],
  );

  const onPointerLeave = useCallback(() => {
    if (!stageRef.current) return;
    stageRef.current.style.setProperty("--abx-parallax-y", "0deg");
    stageRef.current.style.setProperty("--abx-parallax-x", "0deg");
  }, []);

  const staticMode = reduceMotion || lowPower;

  return (
    <div
      className={`abx-defi-centerpiece${staticMode ? " abx-defi-centerpiece--static" : ""}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-hidden="true"
    >
      <div className="abx-defi-centerpiece__atmosphere" />
      <div
        ref={stageRef}
        className="abx-defi-centerpiece__stage"
        style={
          staticMode
            ? undefined
            : {
                transform:
                  "perspective(900px) rotateY(calc(-10deg + var(--abx-parallax-y, 0deg))) rotateX(calc(5deg + var(--abx-parallax-x, 0deg)))",
              }
        }
      >
        <Image
          src={OFFICIAL_EMBLEM_HERO_WEBP.src}
          alt=""
          width={OFFICIAL_EMBLEM_HERO_WEBP.width}
          height={OFFICIAL_EMBLEM_HERO_WEBP.height}
          priority
          fetchPriority="high"
          sizes="(max-width: 720px) 72vw, 420px"
          className="abx-defi-centerpiece__emblem"
        />
        {!staticMode ? <div className="abx-defi-centerpiece__sheen" /> : null}
      </div>
    </div>
  );
}
