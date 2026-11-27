/** Operator-only, read-only readiness check for the existing Launchpad sandbox. */
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";
import { validateSovereignNativeAccountDatabase } from "@/lib/persistence/sovereignNativeAccount";
import { resolveIndependentPostgresUrl } from "@/lib/persistence/env";
import { resolveIssuanceSigningKey } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve";
import { validateNativeAuthRuntimeConfig } from "@/lib/auth/nativeAccount/configValidation";
import pg, { type Client } from "pg";

const LAUNCHPAD_TABLES = [
  "public.partners",
  "public.partner_policies",
  "public.partner_api_keys",
  "public.partner_launchpad_applications",
  "public.partner_launchpad_verification_requests",
  "public.partner_launchpad_signed_receipts",
] as const;

const ACCOUNT_PRINCIPAL_TABLES = [
  "public.abraxas_accounts",
  "public.abraxas_account_partner_memberships",
  "public.abraxas_account_sessions",
] as const;

type InstitutionalPrincipal =
  | { kind: "api_key"; apiKeyId: string }
  | { kind: "account"; accountId: string };

type Result = { status: "PASS" | "BLOCKED"; reasons: string[]; checks: Record<string, boolean> };

export async function runLaunchpadCutoverPreflight(input: {
  applicationId: string;
  partnerId: string;
  principal: InstitutionalPrincipal;
}): Promise<Result> {
  const checks: Record<string, boolean> = {};
  const reasons: string[] = [];
  const check = (name: string, ok: boolean) => {
    checks[name] = ok;
    if (!ok) reasons.push(name);
  };

  check("sovereign_backend_selected", launchpadUsesSovereignPostgres());
  check("independent_database_configured", validateSovereignNativeAccountDatabase().ok);
  const url = resolveIndependentPostgresUrl();
  const nativeUrl = process.env.ABRAXAS_NATIVE_ACCOUNT_DATABASE_URL?.trim();
  check("account_and_launchpad_database_match", Boolean(url) && (!nativeUrl || nativeUrl === url));
  if (input.principal.kind === "account") {
    check("native_account_session_configured", validateNativeAuthRuntimeConfig().ok);
  }
  const signer = resolveIssuanceSigningKey({ schemaVersion: "1.0.0" });
  check("receipt_signer_authorized", signer.ok);

  if (!checks.sovereign_backend_selected || !checks.independent_database_configured
    || !checks.account_and_launchpad_database_match) {
    return { status: "BLOCKED", reasons, checks };
  }

  let client: Client | undefined;
  try {
    if (!url) throw new Error("database_unavailable");
    client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const requiredTables = input.principal.kind === "account"
      ? [...LAUNCHPAD_TABLES, ...ACCOUNT_PRINCIPAL_TABLES]
      : [...LAUNCHPAD_TABLES];
    const tables = await client.query<{ name: string; present: boolean }>(
      `select name, to_regclass(name) is not null as present from unnest($1::text[]) as required(name)`,
      [requiredTables],
    );
    const schemaReady = requiredTables.every((name) => tables.rows.some((row) => row.name === name && row.present));
    check("sovereign_schema_ready", schemaReady);
    if (!schemaReady) return { status: "BLOCKED", reasons, checks };

    const common = await client.query<{
      partner_present: boolean;
      application_bound: boolean;
      policy_active: boolean;
    }>(
      `select
        exists(select 1 from public.partners where partner_id = $2 and 'sandbox' = any(allowed_environments)) as partner_present,
        exists(select 1 from public.partner_launchpad_applications a
          where a.id = $1::uuid and a.partner_id = $2 and a.environment = 'sandbox' and a.status = 'active') as application_bound,
        exists(select 1 from public.partner_launchpad_applications a
          join public.partner_policies p on p.id = a.policy_id and p.version = a.policy_version and p.partner_id = a.partner_id
          where a.id = $1::uuid and a.partner_id = $2 and p.status = 'active') as policy_active`,
      [input.applicationId, input.partnerId],
    );
    const row = common.rows[0];
    check("partner_sandbox_enabled", Boolean(row?.partner_present));
    check("application_bound", Boolean(row?.application_bound));
    check("policy_active_and_bound", Boolean(row?.policy_active));

    if (input.principal.kind === "api_key") {
      const principal = await client.query<{ api_key_authorized: boolean }>(
        `select exists(
          select 1
          from public.partner_api_keys k
          join public.partner_launchpad_applications a on a.id = $1::uuid
          where k.id = $3::uuid
            and k.partner_id = $2
            and k.revoked_at is null
            and 'verify:credential' = any(k.scopes)
            and a.partner_id = k.partner_id
            and a.environment = 'sandbox'
            and a.status = 'active'
            and (a.api_key_id = k.id or k.launchpad_application_id = a.id)
        ) as api_key_authorized`,
        [input.applicationId, input.partnerId, input.principal.apiKeyId],
      );
      check("sandbox_api_key_authorized", Boolean(principal.rows[0]?.api_key_authorized));
    } else {
      const principal = await client.query<{
        account_present: boolean;
        membership_bound: boolean;
        active_session: boolean;
      }>(
        `select
          exists(select 1 from public.abraxas_accounts where account_id = $1) as account_present,
          exists(select 1 from public.abraxas_account_partner_memberships
            where account_id = $1 and partner_id = $2) as membership_bound,
          exists(select 1 from public.abraxas_account_sessions
            where account_id = $1 and revoked_at is null and expires_at > now()) as active_session`,
        [input.principal.accountId, input.partnerId],
      );
      const account = principal.rows[0];
      check("account_present", Boolean(account?.account_present));
      check("membership_bound", Boolean(account?.membership_bound));
      check("active_account_session", Boolean(account?.active_session));
    }
  } catch {
    check("sovereign_database_readable", false);
  } finally {
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined);
      await client.end().catch(() => undefined);
    }
  }
  return { status: reasons.length ? "BLOCKED" : "PASS", reasons, checks };
}

async function main() {
  const [applicationId, partnerId, principalArg] = process.argv.slice(2);
  const apiKeyId = principalArg?.startsWith("api-key:") ? principalArg.slice("api-key:".length) : "";
  const accountId = principalArg?.startsWith("account:") ? principalArg.slice("account:".length) : "";
  const principal: InstitutionalPrincipal | null = apiKeyId
    ? { kind: "api_key", apiKeyId }
    : accountId
      ? { kind: "account", accountId }
      : null;
  if (!applicationId || !partnerId || !principal
    || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(applicationId)
    || (principal.kind === "api_key" && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(principal.apiKeyId))) {
    console.log(JSON.stringify({ status: "BLOCKED", reasons: ["application_partner_principal_arguments_required"] }));
    process.exitCode = 1;
    return;
  }
  const result = await runLaunchpadCutoverPreflight({ applicationId, partnerId, principal });
  console.log(JSON.stringify(result));
  if (result.status !== "PASS") process.exitCode = 1;
}

void main();

