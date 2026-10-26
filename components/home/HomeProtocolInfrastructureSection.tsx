// FILE: components/home/HomeProtocolInfrastructureSection.tsx

import { HomeAbraxasProtocolDiagram } from "@/components/home/HomeAbraxasProtocolDiagram";

export function HomeProtocolInfrastructureSection({
  diagramPriority = true,
}: {
  diagramPriority?: boolean;
}) {
  return (
    <section id="protocol-infrastructure" className="abx-home-protocol abx-home-protocol--diagram-only">
      <HomeAbraxasProtocolDiagram imagePriority={diagramPriority} />
    </section>
  );
}
