// FILE: lib/auth/zkloginIdentitySaveError.ts
// Safe PostgREST error classification for zkLogin identity persistence.

export type ZkLoginIdentitySaveErrorCode =
  | "identity_save_permission_denied"
  | "identity_save_unique_violation"
  | "identity_save_failed";

export function classifyZkLoginIdentitySaveError(error: {
  code?: string | null;
  message?: string | null;
}): ZkLoginIdentitySaveErrorCode {
  const code = error.code?.trim() ?? "";
  if (code === "42501") return "identity_save_permission_denied";
  if (code === "23505") return "identity_save_unique_violation";
  return "identity_save_failed";
}

export function logZkLoginIdentitySaveError(
  error: { code?: string | null; message?: string | null; hint?: string | null },
): void {
  console.error("[zklogin/register] identity_save_failed", {
    code: error.code ?? "unknown",
    hint: error.hint ?? undefined,
  });
}
