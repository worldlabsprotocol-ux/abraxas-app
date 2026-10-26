// FILE: components/home/HomeProtocolInfrastructureSection.tsx

import { HomeAbraxasProtocolDiagram } from "@/components/home/HomeAbraxasProtocolDiagram";

export function HomeProtocolInfrastructureSection() {
  return (
    <section id="protocol-infrastructure" className="abx-home-protocol abx-home-protocol--diagram-only">
      <HomeAbraxasProtocolDiagram />
    </section>
  );
}
