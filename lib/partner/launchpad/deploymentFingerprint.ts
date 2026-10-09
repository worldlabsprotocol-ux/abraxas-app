// FILE: lib/partner/launchpad/deploymentFingerprint.ts
// Safe deployment identity for Launchpad operators (no secrets).

export interface LaunchpadDeploymentFingerprint {
  git_commit_sha: string | null;
  vercel_env: string | null;
}

export function readLaunchpadDeploymentFingerprint(): LaunchpadDeploymentFingerprint {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim()
    ?? process.env.VERCEL_GIT_COMMIT_REF?.trim()
    ?? null;
  const vercelEnv = process.env.VERCEL_ENV?.trim() ?? null;
  return {
    git_commit_sha: sha && /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 40) : null,
    vercel_env: vercelEnv === "production" || vercelEnv === "preview" || vercelEnv === "development"
      ? vercelEnv
      : null,
  };
}

/** Receipt-trust fix landed in merge commit 37427be6 (PR #595). */
export const GOOD_TROUBLE_SANDBOX_RECEIPT_TRUST_MERGE_SHA = "37427be63afaf81431e0ec60c92e7b63e3c37955";

export function deploymentIncludesSandboxReceiptTrustFix(fingerprint: LaunchpadDeploymentFingerprint): boolean {
  if (!fingerprint.git_commit_sha) return false;
  return fingerprint.git_commit_sha.startsWith(GOOD_TROUBLE_SANDBOX_RECEIPT_TRUST_MERGE_SHA.slice(0, 7));
}
