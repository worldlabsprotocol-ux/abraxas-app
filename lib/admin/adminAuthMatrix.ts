// FILE: lib/admin/adminAuthMatrix.ts
// Canonical admin auth matrix for operator surfaces — documentation + regression tests.

export type AdminAuthMechanism =
  | "production_session_email"
  | "session_email_or_pin"
  | "pin_header_or_cookie"
  | "frontend_pin_gate";

export type AdminOperatorRole =
  | "platform_operator"
  | "reviewer"
  | "legacy_asset_reviewer";

export interface AdminAuthMatrixEntry {
  route: string;
  kind: "page" | "api";
  authMechanism: AdminAuthMechanism;
  authorization: string;
  operatorRole: AdminOperatorRole;
  sensitiveData: string;
  mutationCapability: string;
  notes?: string;
}

/** Production-sensitive: email allowlist session only on Production origin. */
export const PRODUCTION_SENSITIVE_API_ROUTES = [
  "/api/admin/partner-keys",
  "/api/admin/passport-support",
  "/api/admin/partners/webhooks/observability",
  "/api/admin/partners/webhooks/sandbox-receipts",
  "/api/admin/design-partners/intake-health",
  "/api/admin/operator-attention",
] as const;

/** Uses requireAdminRouteAccess — production-sensitive on Production origin. */
export const REQUIRE_ADMIN_ROUTE_ACCESS_APIS = [
  "/api/admin/production-review",
  "/api/admin/production-review/[id]/decide",
  "/api/admin/production-review/[id]/credential",
  "/api/admin/binding-production-review",
  "/api/admin/binding-production-review/[id]/decide",
  "/api/admin/design-partners",
  "/api/admin/design-partners/accept",
  "/api/admin/design-partners/enroll",
  "/api/admin/design-partners/pilot",
  "/api/admin/design-partners/criteria",
  "/api/admin/design-partners/permissions",
  "/api/admin/design-partners/decision",
  "/api/admin/policy-proposals",
  "/api/admin/policy-release-candidates",
  "/api/admin/verification-issuer-trust",
  "/api/admin/sandbox-institutional-result",
  "/api/admin/integration-diagnostics",
  "/api/admin/pilot-evidence",
  "/api/admin/value-evidence",
] as const;

/** Upgraded to checkProductionSensitiveAdminAccess in operational readiness closure. */
export const UPGRADED_PRODUCTION_SENSITIVE_APIS = [
  "/api/admin/partners/webhooks",
  "/api/admin/partners/webhooks/delivery-health",
  "/api/admin/partners/webhooks/failed-deliveries",
  "/api/admin/partners/webhooks/retry",
  "/api/admin/partners/webhooks/rotate-secret",
  "/api/admin/privacy/requests",
  "/api/admin/privacy/requests/[requestId]",
  "/api/admin/receipts/[receiptId]",
] as const;

/** Legacy session_email_or_pin — documented migration backlog, not weakened. */
export const LEGACY_CHECK_ADMIN_ACCESS_APIS = [
  "/api/admin/identity/pending-count",
  "/api/admin/identity/queue",
  "/api/admin/identity/approve",
  "/api/admin/identity/document-url",
  "/api/admin/partners",
  "/api/admin/partners/onboarding",
  "/api/admin/partners/entitlements",
  "/api/admin/partners/metering",
  "/api/admin/partner-flow/health",
  "/api/admin/revocation",
  "/api/admin/revocation/subject-access",
] as const;

/** Frontend PIN-in-page gates — legacy, not authoritative for Production mutations. */
export const LEGACY_FRONTEND_PIN_PAGES = [
  "/admin/trust",
  "/admin/connect",
  "/admin/cielo",
  "/admin/inquiries",
  "/admin/listings",
] as const;

export const ADMIN_AUTH_MATRIX: AdminAuthMatrixEntry[] = [
  {
    route: "/admin/* (layout)",
    kind: "page",
    authMechanism: "session_email_or_pin",
    authorization: "Admin layout calls /api/admin/access — PIN blocked on Production UI",
    operatorRole: "platform_operator",
    sensitiveData: "None until authorized",
    mutationCapability: "None",
    notes: "Production origin hides PIN form; session email required.",
  },
  {
    route: "/api/admin/operator-attention",
    kind: "api",
    authMechanism: "production_session_email",
    authorization: "checkProductionSensitiveAdminAccess",
    operatorRole: "platform_operator",
    sensitiveData: "Aggregate queue counts only",
    mutationCapability: "Read-only",
  },
  {
    route: "/api/admin/production-review",
    kind: "api",
    authMechanism: "production_session_email",
    authorization: "requireAdminRouteAccess (strict on Production)",
    operatorRole: "platform_operator",
    sensitiveData: "Application production review queue",
    mutationCapability: "Read queue; decide via sub-route",
  },
  {
    route: "/api/admin/partners/webhooks/retry",
    kind: "api",
    authMechanism: "production_session_email",
    authorization: "checkProductionSensitiveAdminAccess",
    operatorRole: "platform_operator",
    sensitiveData: "Failed delivery metadata",
    mutationCapability: "Requeue failed delivery (audited, same event_id)",
  },
  {
    route: "/api/admin/privacy/requests",
    kind: "api",
    authMechanism: "production_session_email",
    authorization: "checkProductionSensitiveAdminAccess",
    operatorRole: "platform_operator",
    sensitiveData: "Pseudonymized holder requests",
    mutationCapability: "Read queue; mutate via sub-route",
  },
  {
    route: "/api/admin/passport-support",
    kind: "api",
    authMechanism: "production_session_email",
    authorization: "checkProductionSensitiveAdminAccess",
    operatorRole: "platform_operator",
    sensitiveData: "Holder email + support message",
    mutationCapability: "Update support status",
  },
  {
    route: "/api/admin/identity/queue",
    kind: "api",
    authMechanism: "session_email_or_pin",
    authorization: "checkAdminAccess (legacy — migrate)",
    operatorRole: "reviewer",
    sensitiveData: "Identity verification documents",
    mutationCapability: "Approve/reject identity",
    notes: "Migration backlog: upgrade to production-sensitive.",
  },
  {
    route: "/admin/trust",
    kind: "page",
    authMechanism: "frontend_pin_gate",
    authorization: "Client-side PIN check only",
    operatorRole: "legacy_asset_reviewer",
    sensitiveData: "Trust layer inspection",
    mutationCapability: "Limited legacy operations",
    notes: "Legacy — not canonical for partner/production controls.",
  },
];

export function routesRequiringProductionSessionEmail(): readonly string[] {
  return [
    ...PRODUCTION_SENSITIVE_API_ROUTES,
    ...UPGRADED_PRODUCTION_SENSITIVE_APIS,
    ...REQUIRE_ADMIN_ROUTE_ACCESS_APIS,
  ];
}
