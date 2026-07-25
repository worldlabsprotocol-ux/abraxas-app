"use client";
// FILE: components/registry/GoodTroubleRegistryVisual.tsx
// Partner brand card — Good Trouble logo on registry surfaces.

import { GOOD_TROUBLE_REGISTRY_IMAGE } from "@/lib/goodTrouble/registryEntry";

export function GoodTroubleRegistryVisual({ height = 220 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        width: "100%",
        background: "#06090B",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GOOD_TROUBLE_REGISTRY_IMAGE}
        alt="Good Trouble Cannabis"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          display: "block",
        }}
      />
    </div>
  );
}
