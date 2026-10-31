"use client";

import { useSearchParams } from "next/navigation";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { Btn } from "@/components/redesign/ui";

export function VerificationGateway() {
  const searchParams = useSearchParams();
  const partnerRequest = searchParams.get("verify_request")?.trim()
    || searchParams.get("request")?.trim()
    || null;

  const requestHref = partnerRequest
    ? `/partner/continue?verify_request=${encodeURIComponent(partnerRequest)}`
    : "/passport?view=requests";

  return (
    <BuilderActiveTask
      taskKey={partnerRequest ? "review-partner-request" : "find-partner-request"}
      testId="verification-current-task"
      title={partnerRequest ? "Review your partner request" : "No request to review"}
      description={partnerRequest
        ? "Review the partner, purpose, and requested information on the next screen. Consent is explicit; verification runs only if required."
        : "This link did not include a partner request. Open Passport to see requests associated with your account."}
      status={partnerRequest ? "No consent or verification has happened on this page." : undefined}
      action={
        <Btn href={requestHref} size="sm">
          {partnerRequest ? "Review request" : "Open Passport requests"}
        </Btn>
      }
      advanced={
        <details className="abx-builder-technical-panel">
          <summary className="abx-builder-technical-toggle">How consent and verification work</summary>
          <p>Review the request details before choosing whether to consent. A verification check is performed only when the partner's request requires it.</p>
        </details>
      }
    >
      {partnerRequest ? (
        <p className="abx-builder-journey-meta">
          Request reference: <code style={{ overflowWrap: "anywhere" }}>{partnerRequest}</code>
        </p>
      ) : null}
    </BuilderActiveTask>
  );
}
