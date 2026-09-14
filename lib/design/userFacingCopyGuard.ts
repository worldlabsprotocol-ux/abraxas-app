// FILE: lib/design/userFacingCopyGuard.ts
// Scans customer journey copy for forbidden dash punctuation in prose.

import { readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..");

/** Customer journey copy sources only (not admin or developer docs). */
const TARGET_FILES = [
  "lib/partner/partnerHolderCopy.ts",
  "lib/partner/goodTroubleBrowseFlow.ts",
  "lib/passport/passportCustomerCopy.ts",
  "lib/passport/verifiedHero.ts",
  "lib/home/simplifiedHomeCopy.ts",
  "lib/home/assuranceNetworkCopy.ts",
  "lib/idv/identityCaptureCopy.ts",
  "lib/sui/zklogin/signInCopy.ts",
  "lib/integrate/businessPageCopy.ts",
  "lib/integrate/partnerJourney.ts",
  "components/passport/PassportCustomerView.tsx",
  "components/passport/PassportSetupPanel.tsx",
  "components/passport/PassportReauthenticationPanel.tsx",
  "components/passport/PassportSignInRecoveryPanel.tsx",
  "components/passport/PassportVerifySetupRequired.tsx",
  "components/passport/VerificationSuccessPanel.tsx",
  "components/passport/WalletBindingCard.tsx",
  "components/passport/AbraxasIdentityCapture.tsx",
  "components/passport/PassportVerifiedHero.tsx",
  "components/passport/PassportPrivacyCenter.tsx",
  "components/passport/PassportIntentCard.tsx",
  "components/passport/IndependentBiometricStatusCard.tsx",
  "components/partner/PartnerVerifyShell.tsx",
  "components/partner/PartnerJourneyLayout.tsx",
  "components/partner/SelfAttestationBrowseForm.tsx",
  "components/partner/PartnerContinueClient.tsx",
  "components/partner/PartnerEnterClient.tsx",
  "components/partner/AgeAssuranceMethodChooser.tsx",
  "components/redesign/RedesignPageLoading.tsx",
  "app/passport/error.tsx",
  "app/verify/error.tsx",
  "app/legal/privacy/page.tsx",
  "app/legal/terms/page.tsx",
];

function collectTargetFiles(): string[] {
  return TARGET_FILES.map((p) => join(REPO_ROOT, p)).filter((f) => {
    try {
      statSync(f);
      return true;
    } catch {
      return false;
    }
  });
}

function extractStringLiterals(line: string): string[] {
  const results: string[] = [];
  const patterns = [
    /"([^"\\]|\\.)*"/g,
    /'([^'\\]|\\.)*'/g,
    /`([^`\\]|\\.)*`/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const inner = m[0].slice(1, -1);
      if (inner.length >= 6) results.push(inner);
    }
  }
  return results;
}

function isTechnicalString(text: string): boolean {
  if (!/\s/.test(text)) return true;
  if (/^\/[a-z]/.test(text)) return true;
  if (/https?:\/\//.test(text)) return true;
  if (/Content-Type|application\/|abraxas:|abraxas-/.test(text)) return true;
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(text)) return true;
  if (/\b0x[a-fA-F0-9]{6,}\b/.test(text)) return true;
  if (/\bL[0-3]\b/.test(text)) return true;
  if (/\bRPC\b|\btuple\b|\bschema\b|\bmigration\b|\bpolicy engine\b/i.test(text)) return true;
  if (/\bW3C\b|\bJWT\b|\bzkLogin\b/.test(text)) return true;
  if (/px solid|var\(--|JetBrains|ui-monospace|\$\{/.test(text)) return true;
  if (/GET \/api|\/docs\/|npm run|allowSandbox|receipt_id/.test(text)) return true;
  if (/operator-provisioned|self-serve|api-key|callback allowlists/i.test(text)) return true;
  return false;
}

function shouldScanLine(fileRel: string, line: string): boolean {
  if (fileRel === "lib/integrate/partnerJourney.ts") {
    return /HOLDER_|PAYMENT_RETURN_|VERIFY_ERROR_|FOOTER_|SETUP_WALLET_|APPLE_WALLET_|DASHBOARD_LEGACY_/.test(line);
  }
  if (fileRel === "lib/integrate/businessPageCopy.ts") {
    return /BUSINESS_PAGE_|BUSINESS_BENEFITS|BUSINESS_INTEGRATION/.test(line);
  }
  return true;
}

function isProseString(text: string): boolean {
  if (isTechnicalString(text)) return false;
  return /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(text);
}

function hasForbiddenHyphenInProse(text: string): boolean {
  if (text.includes("—") || text.includes("–")) return true;
  if (/\b[A-Za-z]{2,}-[A-Za-z]{2,}\b/.test(text)) return true;
  return false;
}

export interface CopyViolation {
  file: string;
  line: number;
  text: string;
  reason: "em_dash" | "en_dash" | "sentence_hyphen";
}

export function scanUserFacingCopy(): CopyViolation[] {
  const violations: CopyViolation[] = [];
  const files = collectTargetFiles();

  for (const file of files) {
    const rel = relative(REPO_ROOT, file);
    const lines = readFileSync(file, "utf8").split("\n");

    lines.forEach((line, idx) => {
      if (/^\s*\/\//.test(line) || /^\s*\/\*/.test(line)) return;
      if (!shouldScanLine(rel, line)) return;
      const literals = extractStringLiterals(line);
      for (const text of literals) {
        if (!isProseString(text)) continue;
        if (text.includes("—")) {
          violations.push({ file: rel, line: idx + 1, text, reason: "em_dash" });
        } else if (text.includes("–")) {
          violations.push({ file: rel, line: idx + 1, text, reason: "en_dash" });
        } else if (hasForbiddenHyphenInProse(text) && /-/.test(text)) {
          violations.push({ file: rel, line: idx + 1, text, reason: "sentence_hyphen" });
        }
      }
    });
  }

  return violations;
}
