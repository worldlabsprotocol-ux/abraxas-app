"use client";
// FILE: components/verification/VerificationGateway.tsx
// Holder-first verification gateway — one journey, no duplicate consent.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NextActionCard } from "@/components/product/NextActionCard";
import { PrivacyDisclosureCard } from "@/components/product/PrivacyDisclosureCard";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function VerificationGateway() {
  const searchParams = useSearchParams();
  const partnerRequest = searchParams.get("verify_request")?.trim()
    || searchParams.get("request")?.trim()
    || null;

  const nextAction = partnerRequest
    ? {
        action: "Continue your partner verification",
        detail: "You arrived with an active request. Review what will be shared before approving anything.",
        href: `/partner/continue?verify_request=${encodeURIComponent(partnerRequest)}`,
        buttonLabel: "Review request",
      }
    : {
        action: "Open your Passport",
        detail: "Sign in, review partner requests, and reuse verified evidence when eligible.",
        href: "/passport",
        buttonLabel: "Open Passport",
      };

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <NextActionCard
          title="What to do next"
          action={nextAction.action}
          detail={nextAction.detail}
          href={nextAction.href}
          buttonLabel={nextAction.buttonLabel}
        />
      </div>

      <ContentCard title="What verification means here">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: "0 0 0.85rem" }}>
          A partner asks a narrow eligibility question. Abraxas checks your Passport evidence privately and returns only the approved answer — not underlying identity files.
        </p>
        <ol style={{
          fontFamily: FONT,
          fontSize: "0.8rem",
          lineHeight: 1.65,
          color: "var(--text-secondary)",
          margin: "0 0 1rem",
          paddingLeft: "1.15rem",
        }}>
          <li>Understand who is asking and what they need</li>
          <li>Verify only if required</li>
          <li>Consent before anything is shared</li>
          <li>Review the result and return to the partner when ready</li>
        </ol>
        <PrivacyDisclosureCard
          compact
          requester="Example partner"
          requestReason="Private eligibility check"
          requested={[{ label: "Are you eligible for this service?" }]}
          shared={[{ label: "Policy result only (Yes / No / Review)" }]}
          withheld={[
            { label: "Date of birth" },
            { label: "Identity document" },
            { label: "Document number" },
            { label: "Legal name" },
          ]}
        />
      </ContentCard>

      <ContentCard title="Other paths">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-primary)" }}>Partner request inbox.</strong>{" "}
            <Link href="/passport?view=requests" style={{ color: "var(--accent)", fontWeight: 700 }}>Open requests</Link>
            {" "}to review pending verifications.
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-primary)" }}>Sandbox example.</strong>{" "}
            <Link href="/good-trouble" style={{ color: "var(--accent)", fontWeight: 700 }}>Try Good Trouble</Link>
            {" "}to walk through a real 21+ retail flow.
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-primary)" }}>Developer receipt check.</strong>{" "}
            Partners validate signed results on the server.
          </p>
          <Btn href="/verify?mode=receipt" size="sm" variant="secondary">Open receipt verifier</Btn>
        </div>
      </ContentCard>
    </>
  );
}
