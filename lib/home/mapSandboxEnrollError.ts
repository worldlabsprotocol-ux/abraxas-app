// FILE: lib/home/mapSandboxEnrollError.ts

/** Customer-facing copy for sandbox enroll API codes — never expose raw internal codes in UI. */
export function mapSandboxEnrollError(code: string | undefined): string {
  switch (code) {
    case "account_session_required":
      return "Sign in with your Abraxas passkey or Solana wallet account to create a persistent workspace.";
    case "native_account_store_unavailable":
      return "Account service is temporarily unavailable. Try again in a moment or use the public demo.";
    case "invalid_partner_id":
    case "invalid_input":
      return "We could not start your workspace with those details. Try again or contact support.";
    case "provision_failed":
    case "policy_template_not_found":
      return "Sandbox provisioning is not available in this environment yet. Try the public demo or Integration Studio.";
    default:
      return "We could not set up your workspace. Sign in and try again.";
  }
}
