// FILE: lib/partner/starterKit/validate.ts
// Fail-closed selection validation. No user code. No extra keys.

import { studioPackContract } from "@/lib/partner/integrationStudio/catalog";
import { isIntegrationStudioPathId, type IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import {
  PATH_IMPLIED_CAPABILITY,
  STARTER_KIT_ALLOWED_INPUT_KEYS,
  STARTER_KIT_REJECTED_CAPABILITIES,
  isStarterKitOptionalCapability,
  isStarterKitRuntime,
  type StarterKitOptionalCapability,
  type StarterKitRuntime,
} from "./contract";

export interface ValidStarterKitSelection {
  pack_id: string;
  path: IntegrationStudioPathId;
  runtime: StarterKitRuntime;
  capabilities: StarterKitOptionalCapability[];
}

export type StarterKitValidation =
  | { ok: true; selection: ValidStarterKitSelection }
  | { ok: false; code: string };

export function validateStarterKitInput(raw: unknown): StarterKitValidation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, code: "invalid_input" };
  }
  const body = raw as Record<string, unknown>;
  const extra = Object.keys(body).filter(
    (key) => !(STARTER_KIT_ALLOWED_INPUT_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) return { ok: false, code: "unknown_field" };

  const packId = typeof body.pack_id === "string" ? body.pack_id : "";
  const path = typeof body.path === "string" ? body.path : "";
  const runtime = typeof body.runtime === "string" ? body.runtime : "";
  if (!studioPackContract(packId)) return { ok: false, code: "unknown_pack" };
  if (!isIntegrationStudioPathId(path)) return { ok: false, code: "unknown_path" };
  if (!isStarterKitRuntime(runtime)) return { ok: false, code: "unknown_runtime" };

  if (body.capabilities !== undefined && !Array.isArray(body.capabilities)) {
    return { ok: false, code: "invalid_capabilities" };
  }
  const requested = (body.capabilities ?? []) as unknown[];
  const capabilities: StarterKitOptionalCapability[] = [];
  const seen = new Set<string>();
  for (const item of requested) {
    if (typeof item !== "string") return { ok: false, code: "invalid_capabilities" };
    if ((STARTER_KIT_REJECTED_CAPABILITIES as readonly string[]).includes(item)) {
      return { ok: false, code: "capability_rejected" };
    }
    if (!isStarterKitOptionalCapability(item)) return { ok: false, code: "unknown_capability" };
    if (item === PATH_IMPLIED_CAPABILITY[path]) return { ok: false, code: "mixed_selection" };
    if (seen.has(item)) return { ok: false, code: "mixed_selection" };
    seen.add(item);
    capabilities.push(item);
  }

  return {
    ok: true,
    selection: { pack_id: packId, path, runtime, capabilities },
  };
}
