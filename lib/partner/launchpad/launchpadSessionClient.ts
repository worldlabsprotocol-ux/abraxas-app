// FILE: lib/partner/launchpad/launchpadSessionClient.ts
// Browser helpers for Partner Launchpad operator session (API key or native account).

export type LaunchpadSessionEstablishResult =
  | {
      ok: true;
      partner_id: string;
      environment: "sandbox" | "production";
      auth_kind?: "api_key" | "account";
      role?: string;
    }
  | { ok: false; status: number; code?: string; error?: string };

export async function establishLaunchpadSessionWithApiKey(
  apiKey: string,
): Promise<LaunchpadSessionEstablishResult> {
  const res = await fetch("/api/launchpad/auth/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey.trim()}` },
    credentials: "include",
  });
  const data = (await res.json()) as LaunchpadSessionEstablishResult & { error?: string; code?: string };
  if (!res.ok) {
    return { ok: false, status: res.status, code: data.code, error: data.error ?? "Sign in failed" };
  }
  return data;
}

export async function establishLaunchpadSessionWithAccount(input: {
  applicationId?: string | null;
  partnerId?: string | null;
}): Promise<LaunchpadSessionEstablishResult> {
  const body: Record<string, string> = {};
  const applicationId = input.applicationId?.trim();
  const partnerId = input.partnerId?.trim();
  if (applicationId) body.application_id = applicationId;
  if (partnerId) body.partner_id = partnerId;

  const res = await fetch("/api/launchpad/auth/session", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as LaunchpadSessionEstablishResult & { error?: string; code?: string };
  if (!res.ok) {
    return { ok: false, status: res.status, code: data.code, error: data.error ?? "Could not resume Launchpad" };
  }
  return data;
}

export async function claimApplicationMembershipWithApiKey(
  apiKey: string,
): Promise<{ ok: true; partner_id: string; role: string; already_member?: boolean } | { ok: false; status: number; code?: string }> {
  const res = await fetch("/api/account/applications/claim", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: apiKey.trim(), attach_operator_session: true }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    partner_id?: string;
    role?: string;
    already_member?: boolean;
    code?: string;
  };
  if (!res.ok || !data.ok) {
    return { ok: false, status: res.status, code: data.code };
  }
  return {
    ok: true,
    partner_id: data.partner_id ?? "",
    role: data.role ?? "operator",
    already_member: data.already_member,
  };
}
