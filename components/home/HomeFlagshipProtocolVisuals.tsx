import { PolicyAuthorizationFlowVisual, ProtocolDataFlowVisual } from "@/components/protocol-visuals";
import { HomeProtocolVisualDisclosure } from "@/components/home/HomeProtocolVisualDisclosure";

/** Homepage flagship protocol diagrams — visuals carry the story; minimal copy. */
export function HomeFlagshipProtocolVisuals() {
  return (
    <div className="abx-home-flagship-visuals">
      <HomeProtocolVisualDisclosure />
      <ProtocolDataFlowVisual />
      <PolicyAuthorizationFlowVisual />
    </div>
  );
}
