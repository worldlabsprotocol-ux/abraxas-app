// FILE: lib/partner/webhooks/cronAuth.ts
// Fail-closed authorization for secured cron/worker routes.

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

export function authorizeCronRequest(input: {
  cronSecret: string | undefined;
  authorizationHeader: string | null;
}): CronAuthResult {
  if (!input.cronSecret?.trim()) {
    return { ok: false, status: 503, error: "cron_not_configured" };
  }

  if (input.authorizationHeader !== `Bearer ${input.cronSecret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}
