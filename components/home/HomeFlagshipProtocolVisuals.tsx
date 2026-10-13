import { ProtocolDataFlowVisual } from "@/components/protocol-visuals";
import { HomeProtocolVisualDisclosure } from "@/components/home/HomeProtocolVisualDisclosure";

/** Homepage — single flagship protocol diagram (How Abraxas Works). */
export function HomeFlagshipProtocolVisuals() {
  return (
    <div className="abx-home-flagship-visuals abx-home-flagship-visuals--single">
      <HomeProtocolVisualDisclosure />
      <ProtocolDataFlowVisual />
    </div>
  );
}
