import { parseOnchainDeploymentManifest } from "@/lib/partner/onchainGateDeployments/parseManifest";
import type { KitFileKind, TestnetGateKitEnvelope } from "./types";

export function isPlanningEnvelope(raw: unknown): raw is TestnetGateKitEnvelope {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const rec = raw as Record<string, unknown>;
  if (rec.phase !== "planned") return false;
  if (rec.kit_schema_version !== 1 && rec.kit_schema_version !== 2) return false;
  if (rec.live === true) return false;
  if (!rec.bindings || typeof rec.bindings !== "object") return false;
  const registry = rec.registry_manifest;
  return registry == null;
}

export function classifyKitFile(raw: unknown): KitFileKind {
  if (isPlanningEnvelope(raw)) return "plan_envelope";
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "invalid";
  const rec = raw as Record<string, unknown>;
  const candidate = rec.registry_manifest ?? raw;
  const parsed = parseOnchainDeploymentManifest(candidate);
  if (parsed.ok) return "registry_manifest";
  return "invalid";
}
