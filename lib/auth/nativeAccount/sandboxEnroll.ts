// FILE: lib/auth/nativeAccount/sandboxEnroll.ts

import { randomBytes } from "crypto";
import { isValidPartnerId, normalizePartnerId } from "@/lib/partner/partnerIdFormat";
import { provisionLaunchpadSandbox } from "@/lib/partner/launchpad/provisionSandbox";
import {
  getPrimarySandboxEnrollment,
  recordMembershipGrant,
  recordSandboxEnrollment,
  upsertPartnerMembership,
  NativeAccountStoreUnavailableError,
} from "@/lib/auth/nativeAccount/store";
import { issueOperatorSessionForAccountMembership } from "@/lib/partner/launchpad/operatorSessionFromAccount";
import { SITE_URL } from "@/lib/siteUrl";

export type SandboxEnrollResult =
  | {
      ok: true;
      partnerId: string;
      application: Record<string, unknown>;
      operatorSessionToken: string | null;
      apiKeyShownOnce?: string;
    }
  | { ok: false; code: string };

function defaultPartnerIdForAccount(accountId: string): string {
  const suffix = accountId.replace(/^abx_ac_/, "").slice(0, 12);
  return normalizePartnerId(`dev-${suffix}`);
}

export async function enrollSandboxForAccount(input: {
  accountId: string;
  applicationName?: string;
  policyTemplateId?: string;
  idempotencyKey?: string;
}): Promise<SandboxEnrollResult> {
  const existing = await getPrimarySandboxEnrollment(input.accountId);
  if (existing) {
    const operatorSessionToken = await issueOperatorSessionForAccountMembership({
      accountId: input.accountId,
      partnerId: existing.partner_id,
      environment: "sandbox",
    });
    return {
      ok: true,
      partnerId: existing.partner_id,
      application: { application_id: existing.application_id, idempotency_replay: true },
      operatorSessionToken,
    };
  }

  const partnerId = defaultPartnerIdForAccount(input.accountId);
  if (!isValidPartnerId(partnerId)) {
    return { ok: false, code: "invalid_partner_id" };
  }

  const applicationName = (input.applicationName ?? "My sandbox app").trim();
  const policyTemplateId = input.policyTemplateId ?? "age_21_retail";

  let provision;
  try {
    provision = await provisionLaunchpadSandbox({
      applicationName,
      displayName: applicationName,
      partnerId,
      policyTemplateId,
      returnUrl: `${SITE_URL.replace(/\/$/, "")}/developers/launchpad`,
      idempotencyKey: input.idempotencyKey,
    });
  } catch {
    return { ok: false, code: "provision_unavailable" };
  }

  if (!provision.ok) {
    return { ok: false, code: provision.code };
  }

  try {
    await upsertPartnerMembership({
      accountId: input.accountId,
      partnerId,
      role: "owner",
    });
    await recordMembershipGrant({
      accountId: input.accountId,
      partnerId,
      grantMethod: "sandbox_enroll",
      metadata: { application_id: provision.result.application_id },
    });
    await recordSandboxEnrollment({
      accountId: input.accountId,
      partnerId,
      applicationId: provision.result.application_id,
      idempotencyKey: input.idempotencyKey ?? null,
    });
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) {
      return { ok: false, code: "native_account_store_unavailable" };
    }
    throw error;
  }

  const operatorSessionToken = await issueOperatorSessionForAccountMembership({
    accountId: input.accountId,
    partnerId,
    environment: "sandbox",
  });

  const { api_key: apiKey, ...safeApplication } = provision.result;

  return {
    ok: true,
    partnerId,
    application: safeApplication as Record<string, unknown>,
    operatorSessionToken,
    apiKeyShownOnce: provision.apiKey,
  };
}
