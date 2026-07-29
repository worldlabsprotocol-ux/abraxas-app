// FILE: lib/idv/biometric/deepfakeHook.ts
// Pluggable deepfake / synthetic-face hook (provider-backed later).

export type DeepfakeHookStatus = "ok" | "skipped" | "error";

export interface DeepfakeHookResult {
  score: number;
  status: DeepfakeHookStatus;
  provider: string;
  provider_version: string;
  detail?: string;
}

export interface DeepfakeHook {
  readonly providerId: string;
  analyze(selfieBuffer: Buffer): Promise<DeepfakeHookResult>;
}

/** Default: no external provider; score 0, auditable skip. */
export class NoopDeepfakeHook implements DeepfakeHook {
  readonly providerId = "abraxas-noop";

  async analyze(): Promise<DeepfakeHookResult> {
    return {
      score: 0,
      status: "skipped",
      provider: this.providerId,
      provider_version: "1",
      detail: "Deepfake provider not configured",
    };
  }
}

let activeHook: DeepfakeHook = new NoopDeepfakeHook();

export function getDeepfakeHook(): DeepfakeHook {
  return activeHook;
}

/** Test / future provider registration. */
export function setDeepfakeHook(hook: DeepfakeHook): void {
  activeHook = hook;
}

export async function runDeepfakeHook(selfieBuffer: Buffer): Promise<DeepfakeHookResult> {
  try {
    return await getDeepfakeHook().analyze(selfieBuffer);
  } catch (err) {
    return {
      score: 0,
      status: "error",
      provider: getDeepfakeHook().providerId,
      provider_version: "1",
      detail: err instanceof Error ? err.message : "deepfake_hook_failed",
    };
  }
}
