// FILE: lib/partner/sandboxPartnerContract/memoryAdmin.ts
// Isolated Launchpad ports for local conformance. Never used as a production fallback.

import { randomUUID } from "crypto";
import {
  requireWalletStandardTestAdmin,
} from "@/lib/partner/walletStandard/fakeDurableBackend";

class SandboxPartnerAdminMissingError extends Error {
  readonly code = "supabase_admin_not_configured";
  constructor() {
    super("Privileged database access is not configured");
    this.name = "SupabaseAdminConfigurationError";
  }
}

type AppRow = Record<string, unknown>;
type RequestRow = {
  id: string;
  application_id: string;
  partner_id: string;
  status: string;
  request_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const apps = new Map<string, AppRow>();
const requests: RequestRow[] = [];
const activity: Record<string, unknown>[] = [];

export let launchpadAdminMissing = false;
export let launchpadSchemaMissing = false;

export function resetSandboxPartnerMemory(): void {
  apps.clear();
  requests.length = 0;
  activity.length = 0;
  launchpadAdminMissing = false;
  launchpadSchemaMissing = false;
}

export function setLaunchpadAdminMissing(value: boolean): void {
  launchpadAdminMissing = value;
}

export function setLaunchpadSchemaMissing(value: boolean): void {
  launchpadSchemaMissing = value;
}

function schemaError() {
  return { message: "schema_unavailable" };
}

function nowIso(): string {
  return new Date().toISOString();
}

function launchpadFrom(table: string) {
  const filters: Array<[string, string]> = [];
  return {
    select() {
      return this;
    },
    eq(column: string, value: string) {
      filters.push([column, String(value)]);
      return this;
    },
    order() {
      return this;
    },
    maybeSingle() {
      if (launchpadSchemaMissing) return Promise.resolve({ data: null, error: schemaError() });
      const rows = table === "partner_launchpad_applications" ? Array.from(apps.values()) : [];
      const match = rows.find((row) => filters.every(([column, value]) => String(row[column] ?? "") === value));
      return Promise.resolve({ data: match ?? null, error: null });
    },
    single() {
      return this.maybeSingle().then((result) => {
        if (!result.data && !result.error) return { data: null, error: { message: "not_found" } };
        return result;
      });
    },
    insert(row: Record<string, unknown>) {
      if (launchpadSchemaMissing) {
        return {
          select() {
            return {
              single: () => Promise.resolve({ data: null, error: schemaError() }),
            };
          },
        };
      }
      if (table === "partner_production_access_requests") {
        const created: RequestRow = {
          id: randomUUID(),
          application_id: String(row.application_id),
          partner_id: String(row.partner_id),
          status: String(row.status ?? "pending"),
          request_notes: typeof row.request_notes === "string" ? row.request_notes : null,
          created_at: nowIso(),
          reviewed_at: null,
        };
        requests.push(created);
        return {
          select() {
            return {
              single: () => Promise.resolve({ data: created, error: null }),
            };
          },
        };
      }
      if (table === "partner_launchpad_activity") {
        activity.push({ ...row, id: randomUUID(), created_at: nowIso() });
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ error: schemaError() });
    },
  };
}

export function createSandboxPartnerMemoryAdmin() {
  const wallet = requireWalletStandardTestAdmin();
  return {
    rpc(name: string, args: Record<string, unknown>) {
      if (name === "partner_launchpad_provision_sandbox_atomic") {
        if (launchpadSchemaMissing) {
          return Promise.resolve({ data: null, error: { message: "schema_unavailable" } });
        }
        const partnerId = String(args.p_partner_id);
        const publicSlug = String(args.p_public_slug);
        const existing = Array.from(apps.values()).find((row) => row.public_slug === publicSlug && row.partner_id === partnerId);
        if (existing && args.p_idempotency_key && existing.idempotency_key === args.p_idempotency_key) {
          return Promise.resolve({
            data: {
              ok: true,
              code: "idempotency_replay",
              application_id: existing.id,
              partner_id: existing.partner_id,
              public_slug: existing.public_slug,
              policy_id: existing.policy_id,
              policy_version: existing.policy_version,
              key_prefix: existing.key_prefix,
              api_key_id: existing.api_key_id,
            },
            error: null,
          });
        }
        const id = randomUUID();
        const row: AppRow = {
          id,
          public_slug: publicSlug,
          partner_id: partnerId,
          application_name: args.p_application_name,
          display_name: args.p_display_name,
          environment: "sandbox",
          policy_id: args.p_policy_id,
          policy_version: 1,
          policy_template_id: args.p_policy_template_id,
          allowed_return_urls: [args.p_return_url],
          api_key_id: randomUUID(),
          production_api_key_id: null,
          production_key_revealed_at: null,
          status: "active",
          idempotency_key: args.p_idempotency_key ?? null,
          key_prefix: args.p_key_prefix,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        apps.set(id, row);
        return Promise.resolve({
          data: {
            ok: true,
            application_id: id,
            partner_id: partnerId,
            public_slug: publicSlug,
            policy_id: row.policy_id,
            policy_version: 1,
            key_prefix: args.p_key_prefix,
            api_key_id: row.api_key_id,
          },
          error: null,
        });
      }
      return wallet.rpc(name, args as Record<string, string>);
    },
    from(table: string) {
      if (
        table === "partner_launchpad_applications"
        || table === "partner_production_access_requests"
        || table === "partner_launchpad_activity"
      ) {
        return launchpadFrom(table);
      }
      return wallet.from(table);
    },
  };
}

export function requireSandboxPartnerTestAdmin() {
  if (launchpadAdminMissing) throw new SandboxPartnerAdminMissingError();
  return createSandboxPartnerMemoryAdmin();
}

export function memoryApps(): AppRow[] {
  return Array.from(apps.values());
}

export function memoryRequests(): RequestRow[] {
  return [...requests];
}
