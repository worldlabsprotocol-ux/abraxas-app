// FILE: lib/partner/executionContracts/registry.ts
// Executable contract registry — client builders must align with server validators.

import { rejectUnknownJsonKeys } from "@/lib/http/strictJsonBody";
import { LAUNCHPAD_TEST_SCENARIO_BODY_KEYS } from "@/lib/partner/launchpad/testScenarioClientRequest";
import { STARTER_KIT_ALLOWED_INPUT_KEYS } from "@/lib/partner/starterKit/contract";
import {
  LAUNCHPAD_STARTER_KIT_CLIENT_BODY_KEYS,
  LAUNCHPAD_STARTER_KIT_SERVER_EXTENSION_KEYS,
  launchpadStarterKitClientKeysAreDocumented,
} from "@/lib/partner/starterKit/launchpadClientRequest";
import { prepareLaunchpadStarterKitBody } from "@/lib/partner/starterKit/prepareLaunchpadStarterKitBody";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";

export type ExecutionContractId =
  | "launchpad_starter_kit"
  | "launchpad_test_harness";

export interface ExecutionContractDefinition {
  id: ExecutionContractId;
  clientKeys: readonly string[];
  serverValidatorKeys: readonly string[];
  serverExtensionKeys?: readonly string[];
}

export const EXECUTION_CONTRACTS: ExecutionContractDefinition[] = [
  {
    id: "launchpad_starter_kit",
    clientKeys: LAUNCHPAD_STARTER_KIT_CLIENT_BODY_KEYS,
    serverValidatorKeys: STARTER_KIT_ALLOWED_INPUT_KEYS,
    serverExtensionKeys: LAUNCHPAD_STARTER_KIT_SERVER_EXTENSION_KEYS,
  },
  {
    id: "launchpad_test_harness",
    clientKeys: LAUNCHPAD_TEST_SCENARIO_BODY_KEYS,
    serverValidatorKeys: LAUNCHPAD_TEST_SCENARIO_BODY_KEYS,
  },
];

export function assertLaunchpadStarterKitContractIntegrity(): string[] {
  const errors: string[] = [];
  if (!launchpadStarterKitClientKeysAreDocumented()) {
    errors.push("launchpad_starter_kit: client keys must map to generator keys (except binding_id)");
  }
  const sampleClient = {
    binding_id: "bind_demo",
    path: "hosted_partner_flow",
    platform: "wix_velo",
    capabilities: [],
  };
  const clientCheck = rejectUnknownJsonKeys(sampleClient, LAUNCHPAD_STARTER_KIT_CLIENT_BODY_KEYS);
  if (!clientCheck.ok) {
    errors.push(`launchpad_starter_kit: sample client body rejected: ${clientCheck.code}`);
  }
  const prepared = prepareLaunchpadStarterKitBody(sampleClient, "wallet_control");
  const validated = validateStarterKitInput(prepared);
  if (!validated.ok) {
    errors.push(`launchpad_starter_kit: prepared body failed validation: ${validated.code}`);
  }
  const withExtra = { ...sampleClient, rogue_field: true };
  const extraCheck = rejectUnknownJsonKeys(withExtra, LAUNCHPAD_STARTER_KIT_CLIENT_BODY_KEYS);
  if (extraCheck.ok) {
    errors.push("launchpad_starter_kit: expected unknown_field for rogue client key");
  }
  return errors;
}
