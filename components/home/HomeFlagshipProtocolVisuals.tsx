import { PolicyAuthorizationFlowVisual, ProtocolDataFlowVisual } from "@/components/protocol-visuals";

/** Homepage flagship protocol diagrams — visuals carry the story; minimal copy. */
export function HomeFlagshipProtocolVisuals() {
  return (
    <div className="abx-home-flagship-visuals">
      <ProtocolDataFlowVisual />
      <PolicyAuthorizationFlowVisual />
    </div>
  );
}
