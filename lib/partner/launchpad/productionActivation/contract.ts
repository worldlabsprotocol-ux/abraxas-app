// FILE: lib/partner/launchpad/productionActivation/contract.ts
// Canonical production activation — one write path for review approval + environment + credential.

export const PRODUCTION_ACTIVATION_RPC = "partner_launchpad_activate_production_atomic" as const;

/** @deprecated Legacy combined approval RPC (085). Application code must not call directly. */
export const LEGACY_PRODUCTION_APPROVAL_RPC = "partner_launchpad_approve_production_atomic" as const;

/** @deprecated Legacy credential-only RPC (095). Use activation for issue; rotate/revoke remain valid. */
export const LEGACY_PRODUCTION_CREDENTIAL_RPC = "partner_launchpad_operate_production_credential_atomic" as const;

export const PRODUCTION_ACTIVATION_AUDIT_EVENT = "production_application_activated" as const;

export const PRODUCTION_ACTIVATION_LIFECYCLE = [
  "sandbox",
  "production_requested",
  "production_review",
  "production_approved",
  "production_active",
] as const;
export type ProductionActivationLifecycle = (typeof PRODUCTION_ACTIVATION_LIFECYCLE)[number];

export const PRODUCTION_ACTIVATION_LIFECYCLE_LABEL: Record<ProductionActivationLifecycle, string> = {
  sandbox: "Sandbox",
  production_requested: "Production requested",
  production_review: "Under production review",
  production_approved: "Review approved — activation pending",
  production_active: "Production active",
};

export const PRODUCTION_ACTIVATION_NOTICE =
  "Activating production approves the reviewed integration, sets the app environment to production, pins the reviewed policy version, and issues one abx_live_ credential. The raw secret is encrypted for one-time partner reveal. Retry is idempotent and does not mint a second secret.";
