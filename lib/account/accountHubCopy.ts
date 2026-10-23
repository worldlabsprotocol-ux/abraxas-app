// FILE: lib/account/accountHubCopy.ts
// Unified Abraxas account hub — holder session vs partner console session (independent).

export const ACCOUNT_HUB_EYEBROW = "Account" as const;

export const ACCOUNT_HUB_TITLE = "Your Abraxas account" as const;

export const ACCOUNT_HUB_SUBHEAD =
  "One sign-in for Passport, personal credentials, and authorized Partner Launchpad workspaces. Server API keys remain for integrations — not repeated operator login." as const;

export const ACCOUNT_SESSIONS_INDEPENDENT_NOTICE =
  "Launchpad operator access requires explicit partner membership on your Abraxas account. Membership is never inferred from wallet, email, or founder status." as const;

export const ACCOUNT_USE_CASE_HEADING = "What do you need today?" as const;

export const ACCOUNT_USE_CASE_SUBHEAD =
  "After Solana sign-in, pick how you want to work with Abraxas today." as const;

export type AccountUseCaseId = "verify_self" | "connect_application" | "manage_organization";

export const ACCOUNT_USE_CASES: ReadonlyArray<{
  id: AccountUseCaseId;
  title: string;
  summary: string;
  href: string;
  primaryCta: string;
}> = [
  {
    id: "connect_application",
    title: "Start building",
    summary: "Open your sandbox workspace, configure policy, run verification, and validate signed receipts.",
    href: "/developers/launchpad",
    primaryCta: "Open Launchpad",
  },
  {
    id: "manage_organization",
    title: "Integrate with my business",
    summary: "Institutional integration, pricing, and production readiness — separate from sandbox checkout.",
    href: "/developers/institutional-integration",
    primaryCta: "Business integration",
  },
  {
    id: "verify_self",
    title: "Verify myself",
    summary: "Passport and personal credentials when a policy requires holder evidence.",
    href: "/account/passport",
    primaryCta: "Open Passport",
  },
];

export const ACCOUNT_APPLICATIONS_TITLE = "Applications" as const;

export const ACCOUNT_APPLICATIONS_SUBHEAD =
  "Resume Partner Launchpad with an authorized operator session, or start sandbox provisioning in Integration Studio." as const;

export const ACCOUNT_ORGANIZATIONS_TITLE = "Organizations" as const;

export const ACCOUNT_ORGANIZATIONS_SUBHEAD =
  "Institutional eligibility and partner program enrollment. Production organization access requires operator approval — it is never inferred from your wallet or email." as const;

export const ACCOUNT_SETTINGS_TITLE = "Settings" as const;

export const ACCOUNT_SETTINGS_SUBHEAD =
  "Sessions, wallet binding, and sign-out. Ending one session does not revoke the other." as const;

export const ACCOUNT_CREDENTIALS_TITLE = "Credentials" as const;

export const ACCOUNT_CREDENTIALS_SUBHEAD =
  "Registry lookup, credential JWT testing, and portable trust exports live in Passport." as const;

export const ACCOUNT_PARTNER_SESSION_TITLE = "Partner Launchpad session" as const;

export const ACCOUNT_PARTNER_SESSION_BODY =
  "When your account has partner membership, resume Launchpad with one click. Operator sessions use an HttpOnly cookie — API keys stay for server integrations only." as const;

export const ACCOUNT_PARTNER_RECOVERY_TITLE = "First-time access to an existing application" as const;

export const ACCOUNT_PARTNER_RECOVERY_BODY =
  "If membership is not yet linked, prove access once with the sandbox API key shown at provisioning. After that, your Abraxas account can resume without pasting the secret again." as const;

export const ACCOUNT_HOLDER_SIGN_IN_REQUIRED =
  "Sign in to view your account hub. Passport and Launchpad operator sessions remain separate." as const;
