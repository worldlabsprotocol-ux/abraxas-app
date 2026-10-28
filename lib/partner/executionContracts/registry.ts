// FILE: lib/partner/executionContracts/registry.ts
// Executable contract registry — client builders must align with server validators.

import { rejectUnknownJsonKeys } from "@/lib/http/strictJsonBody";
import { SANDBOX_RECEIPT_VALIDATE_BODY_KEYS } from "@/lib/auth/ephemeralWallet/sandboxValidateClientRequest";
import { WALLET_ACTION_CHALLENGE_BODY_KEYS } from "@/lib/auth/ephemeralWallet/walletActionChallengeClientRequest";
import { parseHandoffCreateBody } from "@/lib/partner/hostedHandoff/parse";
import {
  PARTNER_HANDOFF_CREATE_BODY_KEYS,
  buildPartnerHandoffCreateRequestBody,
  partnerHandoffClientKeysAreDocumented,
} from "@/lib/partner/hostedHandoff/handoffClientRequest";
import { HOSTED_HANDOFF_ALLOWED_KEYS } from "@/lib/partner/hostedHandoff/contract";
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
  | "launchpad_test_harness"
  | "partner_handoff_create"
  | "wallet_action_challenge"
  | "sandbox_receipt_validate"
  | "institutional_mandate_enforcement"
  | "portable_receipt_verification";

export interface ExecutionContractDefinition {
  id: ExecutionContractId;
  clientKeys: readonly string[];
  serverValidatorKeys: readonly string[];
  serverExtensionKeys?: readonly string[];
  /** Non-HTTP boundary covered by named vitest suite in execution contract guard. */
  routeOrSuiteTest?: string;
}

export const EXECUTION_CONTRACTS: ExecutionContractDefinition[] = [
  {
    id: "launchpad_starter_kit",
    clientKeys: LAUNCHPAD_STARTER_KIT_CLIENT_BODY_KEYS,
    serverValidatorKeys: STARTER_KIT_ALLOWED_INPUT_KEYS,
    serverExtensionKeys: LAUNCHPAD_STARTER_KIT_SERVER_EXTENSION_KEYS,
    routeOrSuiteTest: "lib/partner/launchpad/starterKitLaunchpadRoute.test.ts",
  },
  {
    id: "launchpad_test_harness",
    clientKeys: LAUNCHPAD_TEST_SCENARIO_BODY_KEYS,
    serverValidatorKeys: LAUNCHPAD_TEST_SCENARIO_BODY_KEYS,
  },
  {
    id: "partner_handoff_create",
    clientKeys: PARTNER_HANDOFF_CREATE_BODY_KEYS,
    serverValidatorKeys: HOSTED_HANDOFF_ALLOWED_KEYS,
    routeOrSuiteTest: "lib/partner/hostedHandoff/partnerHandoffRoute.test.ts",
  },
  {
    id: "wallet_action_challenge",
    clientKeys: WALLET_ACTION_CHALLENGE_BODY_KEYS,
    serverValidatorKeys: WALLET_ACTION_CHALLENGE_BODY_KEYS,
    routeOrSuiteTest: "lib/auth/ephemeralWallet/walletActionChallengeRoute.test.ts",
  },
  {
    id: "sandbox_receipt_validate",
    clientKeys: SANDBOX_RECEIPT_VALIDATE_BODY_KEYS,
    serverValidatorKeys: SANDBOX_RECEIPT_VALIDATE_BODY_KEYS,
    routeOrSuiteTest: "lib/auth/ephemeralWallet/sandboxValidateRoute.test.ts",
  },
  {
    id: "institutional_mandate_enforcement",
    clientKeys: [],
    serverValidatorKeys: [],
    routeOrSuiteTest: "lib/institutional/mandate/build889InstitutionalReliability.adversarial.test.ts",
  },
  {
    id: "portable_receipt_verification",
    clientKeys: [],
    serverValidatorKeys: [],
    routeOrSuiteTest: "examples/portable-relying-party/portable-relying-party.test.ts",
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

function assertPartnerHandoffContractIntegrity(): string[] {
  const errors: string[] = [];
  if (!partnerHandoffClientKeysAreDocumented()) {
    errors.push("partner_handoff_create: client keys must match HOSTED_HANDOFF_ALLOWED_KEYS");
  }
  const body = buildPartnerHandoffCreateRequestBody({ bindingId: "bind_1", runtime: "wix_velo" });
  const parsed = parseHandoffCreateBody(body);
  if (!parsed.ok) {
    errors.push(`partner_handoff_create: canonical body rejected: ${parsed.code}`);
  }
  const rogue = parseHandoffCreateBody({ ...body, policy_id: "evil" });
  if (rogue.ok || (rogue.ok === false && rogue.code !== "client_override_rejected")) {
    errors.push("partner_handoff_create: expected client_override_rejected for policy_id");
  }
  const unknown = parseHandoffCreateBody({ ...body, forged: true });
  if (unknown.ok || (unknown.ok === false && unknown.code !== "unknown_field")) {
    errors.push("partner_handoff_create: expected unknown_field for forged key");
  }
  return errors;
}

function assertWalletActionChallengeContractIntegrity(): string[] {
  const errors: string[] = [];
  const sample = {
    operation: "sandbox:enter",
    resource: "abraxas:sandbox:ws:policy:wallet_control",
  };
  if (!rejectUnknownJsonKeys(sample, WALLET_ACTION_CHALLENGE_BODY_KEYS).ok) {
    errors.push("wallet_action_challenge: minimal body rejected");
  }
  const rogue = rejectUnknownJsonKeys({ ...sample, admin: true }, WALLET_ACTION_CHALLENGE_BODY_KEYS);
  if (rogue.ok) {
    errors.push("wallet_action_challenge: expected unknown_field for rogue key");
  }
  return errors;
}

function assertSandboxReceiptValidateContractIntegrity(): string[] {
  const errors: string[] = [];
  const sample = { receipt: { receipt_id: "r1" } };
  if (!rejectUnknownJsonKeys(sample, SANDBOX_RECEIPT_VALIDATE_BODY_KEYS).ok) {
    errors.push("sandbox_receipt_validate: sample body rejected");
  }
  const rogue = rejectUnknownJsonKeys({ ...sample, partner_id: "evil" }, SANDBOX_RECEIPT_VALIDATE_BODY_KEYS);
  if (rogue.ok) {
    errors.push("sandbox_receipt_validate: expected unknown_field for partner_id");
  }
  return errors;
}

/** Static integrity for all registered execution contracts (Build 890). */
export function assertExecutionContractRegistryIntegrity(): string[] {
  return [
    ...assertLaunchpadStarterKitContractIntegrity(),
    ...assertPartnerHandoffContractIntegrity(),
    ...assertWalletActionChallengeContractIntegrity(),
    ...assertSandboxReceiptValidateContractIntegrity(),
  ];
}
