"use client";
// FILE: components/passport/PassportVerifySetupRequired.tsx
// Helpful gate for /passport?view=verify when holder setup is still incomplete.

import Link from "next/link";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import { Btn } from "@/components/redesign/ui";
import { buildPassportSetupHref } from "@/lib/passport/passportVerifyAccess";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function PassportVerifySetupRequired({
  setup,
  partnerParams,
}: {
  setup: PassportSetupState;
  partnerParams: URLSearchParams;
}) {
  const continueHref = buildPassportSetupHref(partnerParams);

  return (
    <section
      aria-labelledby="verify-setup-required-heading"
      style={{
        marginBottom: "1.25rem",
        padding: "1rem 1.15rem",
        borderRadius: 16,
        border: "1px solid rgba(245,158,11,0.35)",
        background: "rgba(245,158,11,0.06)",
      }}
    >
      <div style={{
        fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#F59E0B", marginBottom: "0.4rem",
      }}>
        Setup required
      </div>
      <h2 id="verify-setup-required-heading" style={{
        fontFamily: FONT, fontSize: "1rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.45rem",
      }}>
        Finish Passport setup to use credential tools
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 0.85rem", maxWidth: 560,
      }}>
        {setup.nextAction === "sign_in"
          ? "Sign in first so Abraxas can attach verification tools to your wallet."
          : "Bind your wallet with one signature before testing credential JWTs. Registry lookup below still works."}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <Btn href={continueHref} size="sm">
          {setup.nextActionLabel} →
        </Btn>
        <Link
          href={continueHref}
          style={{
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
            color: ACCENT, textDecoration: "none",
          }}
        >
          Continue setup ({setup.stepLabel})
        </Link>
      </div>
    </section>
  );
}
