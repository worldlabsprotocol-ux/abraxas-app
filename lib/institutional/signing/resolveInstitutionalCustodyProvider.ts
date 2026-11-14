// Selects custody backend for the institutional worker. AWS is optional, not mandatory.

export const INSTITUTIONAL_CUSTODY_PROVIDER_ENV = "ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER" as const;

export const INSTITUTIONAL_CUSTODY_PROVIDERS = [
  "aws-kms",
  "demo-memory",
  "self-hosted-file",
] as const;

export type InstitutionalCustodyProvider = (typeof INSTITUTIONAL_CUSTODY_PROVIDERS)[number];

export type ResolvedInstitutionalCustodyProvider =
  | { provider: "demo-memory" }
  | { provider: "self-hosted-file"; issuerSeedPath: string; statusSeedPath: string }
  | { provider: "aws-kms" };

export function resolveInstitutionalCustodyProvider(
  env: Record<string, string | undefined>,
): ResolvedInstitutionalCustodyProvider | { ok: false; reason: string } {
  const explicit = env[INSTITUTIONAL_CUSTODY_PROVIDER_ENV]?.trim() as InstitutionalCustodyProvider | undefined;
  const demoMemory = env.ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY?.trim() === "1";

  if (demoMemory) {
    if (explicit && explicit !== "demo-memory") {
      return { ok: false, reason: "worker_demo_memory_conflicts_with_explicit_provider" };
    }
    return { provider: "demo-memory" };
  }

  if (explicit === "demo-memory") {
    return { provider: "demo-memory" };
  }

  if (explicit === "self-hosted-file" || (!explicit && env.ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH?.trim())) {
    const issuerSeedPath = env.ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH?.trim() ?? "";
    const statusSeedPath = env.ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH?.trim() ?? "";
    if (!issuerSeedPath || !statusSeedPath) {
      return { ok: false, reason: "worker_self_hosted_seed_paths_incomplete" };
    }
    if (issuerSeedPath === statusSeedPath) {
      return { ok: false, reason: "worker_self_hosted_seed_paths_must_differ" };
    }
    return { provider: "self-hosted-file", issuerSeedPath, statusSeedPath };
  }

  if (!explicit || explicit === "aws-kms") {
    return { provider: "aws-kms" };
  }

  return { ok: false, reason: "worker_custody_provider_unrecognized" };
}

export function institutionalSignerProviderLabel(
  resolved: ResolvedInstitutionalCustodyProvider,
): "memory" | "aws-kms" | "self-hosted-software" {
  if (resolved.provider === "demo-memory") return "memory";
  if (resolved.provider === "self-hosted-file") return "self-hosted-software";
  return "aws-kms";
}