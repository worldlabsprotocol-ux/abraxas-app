// FILE: components/home/HomeAbraxasProtocolDiagram.tsx
// Founder protocol diagram: desktop artwork, mobile vertical architecture.

import Image from "next/image";
import { HomeAbraxasSystemArchitectureDiagram } from "@/components/home/HomeAbraxasSystemArchitectureDiagram";

const DESKTOP_ART = "/home/abraxas-protocol-architecture.png";

export function HomeAbraxasProtocolDiagram() {
  return (
    <div className="abx-protocol-diagram" aria-label="Abraxas protocol architecture">
      <div className="abx-protocol-diagram__desktop" aria-hidden={false}>
        <Image
          src={DESKTOP_ART}
          alt="Abraxas independent trust infrastructure: authoritative inputs, signed decision layer, portable verification, and partner enforcement with permit, deny, or indeterminate outcomes. Current acceptability requires signed status freshness, not receipt signature alone."
          width={2400}
          height={1350}
          className="abx-protocol-diagram__art"
          priority
          sizes="(max-width: 960px) 0px, min(1200px, 100vw)"
        />
      </div>
      <div className="abx-protocol-diagram__mobile">
        <HomeAbraxasSystemArchitectureDiagram variant="mobilePrimary" />
      </div>
    </div>
  );
}
