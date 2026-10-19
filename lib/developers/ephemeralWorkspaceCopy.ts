// FILE: lib/developers/ephemeralWorkspaceCopy.ts

export const EPHEMERAL_WORKSPACE_PAGE_TITLE = "Developer Workspace";
export const EPHEMERAL_WORKSPACE_PAGE_EYEBROW = "Developers";
export const EPHEMERAL_WORKSPACE_PAGE_SUBTITLE =
  "Build and verify with your wallet. Explore policies, test verification, and validate signed results in a secure sandbox.";

export const EPHEMERAL_WORKSPACE_TEST_ONLY_NOTE =
  "Sandbox only — test receipts and workspace metadata expire automatically. Not Production authority.";

export function mapSandboxEnterFailure(code?: string | null): string {
  switch (code) {
    case "ephemeral_state_unavailable":
      return "Sandbox storage is temporarily unavailable. Try again shortly or contact support with the correlation id below.";
    case "store_unavailable":
      return "Authorization storage is temporarily unavailable. Try again in a moment.";
    case "session_context_mismatch":
      return "Your authorization context expired. Click Start building again.";
    case "invalid_signature":
      return "Wallet signature could not be verified. Try again.";
    case "wrong_signer":
      return "This wallet does not match your signed-in session.";
    case "expired":
      return "Authorization expired. Start building again.";
    case "replay":
      return "This authorization was already used. Refresh or start again.";
    default:
      return code ? `Could not open workspace (${code}). Try again.` : "Could not open workspace. Try again.";
  }
}
