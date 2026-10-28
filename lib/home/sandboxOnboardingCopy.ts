// FILE: lib/home/sandboxOnboardingCopy.ts

import { TERM_TEST_WORKSPACE } from "@/lib/product/userFacingTerminology";

export const SANDBOX_ACCOUNT_STEP_LEAD =
  "Create an Abraxas account with a passkey, or sign in with your Solana wallet, before provisioning a persistent sandbox workspace.";

export const SANDBOX_ACCOUNT_PASSKEY_CREATE = "Create account";
export const SANDBOX_ACCOUNT_PASSKEY_SIGN_IN = "Sign in with passkey";

export const SANDBOX_EPHEMERAL_SIGNED_IN_LEAD =
  "You are signed in with a temporary wallet session. Explore the sandbox without a persistent workspace, or use the public demo with no sign-in.";

export const SANDBOX_EPHEMERAL_CTA = `Open ${TERM_TEST_WORKSPACE.toLowerCase()}`;
export const SANDBOX_WORKSPACE_STEP_LEAD =
  "Set up your private development workspace. This requires a signed-in Abraxas account.";

export const SANDBOX_WALLET_ONLY_HINT =
  "A header wallet connection alone does not create a workspace. Complete account sign-in below first.";
