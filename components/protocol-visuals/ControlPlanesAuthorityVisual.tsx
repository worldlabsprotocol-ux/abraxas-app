import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

export function ControlPlanesAuthorityVisual() {
  return (
    <ProtocolVisualShell
      kicker="Governance"
      title="Separated"
      titleAccent="control planes."
      caption="Program upgrades, registry governance, and operational publish/revoke roles stay isolated — multisig recommended where configured."
    >
      <ProtocolDiagramFigure
        src="/protocol-visuals/control-planes-separated-authority.png"
        alt="Control planes diagram comparing weak shared-wallet risk against strong isolated authorities for program upgrade, registry governance, and operational roles."
        width={1920}
        height={1080}
      />
    </ProtocolVisualShell>
  );
}
