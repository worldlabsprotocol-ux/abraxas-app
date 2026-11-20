import { evaluateConnectedSandboxBoundary } from "./connectedSandboxBoundary";

export type Token2022StudioEnvironmentKind =
  | "production_unavailable"
  | "local_program_test_reference"
  | "connected_sandbox";

export type Token2022StudioEnvironment = {
  kind: Token2022StudioEnvironmentKind;
  label: string;
  mint_and_consume_actionable: boolean;
  proof_continuity_on_rpc: boolean;
  entitlement_consumer_on_rpc: boolean;
  rpc_url: string | null;
  registry_admin: string | null;
  cluster_label: string | null;
  detail: string;
};

export async function resolveToken2022StudioEnvironment(): Promise<Token2022StudioEnvironment> {
  const boundary = await evaluateConnectedSandboxBoundary();
  if (!boundary.ok) {
    const kind: Token2022StudioEnvironmentKind =
      boundary.code === "production_entitlement_unavailable"
        ? "production_unavailable"
        : "local_program_test_reference";
    return {
      kind,
      label: boundary.code,
      mint_and_consume_actionable: false,
      proof_continuity_on_rpc: false,
      entitlement_consumer_on_rpc: false,
      rpc_url: null,
      registry_admin: null,
      cluster_label: null,
      detail: boundary.detail,
    };
  }

  const programsVisible = boundary.mint_and_consume_actionable
    || Boolean(boundary.registry_pda);
  return {
    kind: programsVisible ? "connected_sandbox" : "local_program_test_reference",
    label: boundary.cluster_label,
    mint_and_consume_actionable: boundary.mint_and_consume_actionable,
    proof_continuity_on_rpc: programsVisible,
    entitlement_consumer_on_rpc: programsVisible,
    rpc_url: boundary.rpc_url,
    registry_admin: boundary.registry_admin,
    cluster_label: boundary.cluster_label,
    detail: boundary.mint_and_consume_actionable
      ? "Connected sandbox is ready for holder-wallet mint and consume transactions."
      : "Programs or operator infrastructure accounts are not ready on the pinned RPC. See BUILD #983 deployment package.",
  };
}