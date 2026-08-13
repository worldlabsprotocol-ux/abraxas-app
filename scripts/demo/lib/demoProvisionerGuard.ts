// FILE: scripts/demo/lib/demoProvisionerGuard.ts
// Apply/verify guards and exit codes for the Partner Sandbox holder provisioner.

import {
  assertDatabaseUrlMatchesDemoRef,
  DemoDatabaseUrlError,
} from "./demoDatabaseUrl";
import { assertSslRootCertPathConfigured } from "./demoSslRootCert";
import {
  DemoProjectGuardError,
  validateReadOnlyDemoConfig,
  type DemoProjectGuardConfig,
} from "./demoProjectGuard";

export const PROVISIONER_EXIT = {
  success: 0,
  failure: 1,
  config: 2,
  conflict: 3,
  committedStateWriteFailed: 4,
  lockHeld: 5,
} as const;

export type ProvisionerMode = "dry-run" | "apply" | "verify";

export interface ProvisionerCliArgs {
  mode: ProvisionerMode;
  confirm?: string;
  recoverProvisionId?: string;
}

export class DemoProvisionerConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoProvisionerConflictError";
  }
}

export class DemoProvisionerLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoProvisionerLockError";
  }
}

export class DemoProvisionerCommittedStateError extends Error {
  readonly provisionId: string;

  constructor(provisionId: string) {
    super(
      "Database commit succeeded but state file write failed — recover with --verify --recover",
    );
    this.name = "DemoProvisionerCommittedStateError";
    this.provisionId = provisionId;
  }
}

export function parseProvisionerArgs(argv: string[]): ProvisionerCliArgs {
  let apply = false;
  let verify = false;
  let confirm: string | undefined;
  let recoverProvisionId: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--verify") {
      verify = true;
      continue;
    }
    if (arg === "--confirm") {
      confirm = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--confirm=")) {
      confirm = arg.slice("--confirm=".length);
      continue;
    }
    if (arg === "--recover") {
      recoverProvisionId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--recover=")) {
      recoverProvisionId = arg.slice("--recover=".length);
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (apply && verify) {
    throw new Error("--apply and --verify are mutually exclusive");
  }

  if (recoverProvisionId && !verify) {
    throw new Error("--recover requires --verify");
  }

  if (apply) {
    return { mode: "apply", confirm };
  }
  if (verify) {
    return { mode: "verify", recoverProvisionId };
  }
  return { mode: "dry-run" };
}

export interface ProvisionerDryRunConfig extends DemoProjectGuardConfig {
  issuer: string;
}

export interface ProvisionerDatabaseConfig extends ProvisionerDryRunConfig {
  databaseUrl: string;
}

export function validateProvisionerDryRunConfig(
  env: Record<string, string | undefined>,
): ProvisionerDryRunConfig {
  const guard = validateReadOnlyDemoConfig(env);
  const issuer = resolveProvisionerIssuerFromEnv(env);
  return { ...guard, issuer };
}

function resolveProvisionerIssuerFromEnv(env: Record<string, string | undefined>): string {
  const fromIssuer = env.ABRAXAS_ISSUER_URL?.trim();
  if (fromIssuer) return fromIssuer.replace(/\/$/, "");
  const fromApp = env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromApp) return fromApp.replace(/\/$/, "");
  throw new Error("ABRAXAS_ISSUER_URL or NEXT_PUBLIC_APP_URL is required");
}

export function validateProvisionerDatabaseConfig(
  env: Record<string, string | undefined>,
  databaseUrl: string,
): ProvisionerDatabaseConfig {
  const dryRun = validateProvisionerDryRunConfig(env);
  const parsed = assertDatabaseUrlMatchesDemoRef(databaseUrl, dryRun.demoProjectRef);
  if (parsed.transport === "supabase_session_pooler") {
    assertSslRootCertPathConfigured(env);
  }
  return {
    ...dryRun,
    databaseUrl,
  };
}

export function assertApplyConfirmation(
  confirm: string | undefined,
  demoProjectRef: string,
): void {
  const trimmed = confirm?.trim();
  if (!trimmed) {
    throw new DemoProjectGuardError(
      "demo_ref_missing",
      "--confirm <demo-project-ref> is required for --apply",
    );
  }
  if (trimmed !== demoProjectRef) {
    throw new DemoProjectGuardError(
      "demo_ref_mismatch",
      "--confirm must exactly match DEMO_SUPABASE_PROJECT_REF",
    );
  }
}

export function mapProvisionerErrorToExitCode(error: unknown): number {
  if (error instanceof DemoProjectGuardError) return PROVISIONER_EXIT.config;
  if (error instanceof DemoDatabaseUrlError) return PROVISIONER_EXIT.config;
  if (error instanceof DemoProvisionerConflictError) return PROVISIONER_EXIT.conflict;
  if (error instanceof DemoProvisionerLockError) return PROVISIONER_EXIT.lockHeld;
  if (error instanceof DemoProvisionerCommittedStateError) {
    return PROVISIONER_EXIT.committedStateWriteFailed;
  }
  return PROVISIONER_EXIT.failure;
}

export function rejectProductionNodeEnv(env: Record<string, string | undefined>): void {
  if (env.NODE_ENV?.trim() === "production") {
    throw new Error("Partner Sandbox provisioner refuses NODE_ENV=production");
  }
}
