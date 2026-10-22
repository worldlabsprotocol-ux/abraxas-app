"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AbxInstitutionalWorkspaceShell } from "@/components/design/AbxInstitutionalWorkspaceShell";
import { IntegrationStudioStageGuide } from "@/components/developers/IntegrationStudioStageGuide";
import { IntegrationStudioStageProvider } from "@/lib/developers/integrationStudioStageContext";
import type { IntegrationStudioStageId } from "@/lib/developers/useIntegrationStudioStage";
import { integrationStudioStageFromHash } from "@/lib/developers/useIntegrationStudioStage";

const STEPS: Array<{ id: IntegrationStudioStageId | "receipt" | "verify" | "production"; label: string; href: string }> = [
  { id: "policy", label: "Policy", href: "/developers/integration-studio" },
  { id: "sandbox", label: "Sandbox", href: "/developers/integration-studio#sandbox" },
  { id: "configuration", label: "Configuration", href: "/developers/integration-studio#configuration" },
  { id: "request", label: "Request", href: "/developers/integration-studio#request" },
  { id: "receipt", label: "Receipt", href: "/verify?mode=receipt" },
  { id: "verify", label: "Verification", href: "/verify" },
  { id: "production", label: "Production review", href: "/developers/launchpad" },
] as const;

function activeStepFromHash(hash: string): IntegrationStudioStageId | "receipt" | "verify" | "production" {
  if (hash === "#sandbox") return "sandbox";
  if (hash === "#configuration") return "configuration";
  if (hash === "#request") return "request";
  return integrationStudioStageFromHash(hash);
}

export function IntegrationStudioWorkspace({
  inspector,
  children,
}: {
  inspector?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [hashStep, setHashStep] = useState<IntegrationStudioStageId | "receipt" | "verify" | "production">("policy");

  useEffect(() => {
    const sync = () => setHashStep(activeStepFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  function navigateInStudioStage(href: string, event: MouseEvent) {
    if (pathname !== "/developers/integration-studio") return;
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return;
    event.preventDefault();
    const hash = href.slice(hashIndex);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      setHashStep(activeStepFromHash(hash));
    }
  }

  const studioStage: IntegrationStudioStageId =
    hashStep === "policy" || hashStep === "sandbox" || hashStep === "configuration" || hashStep === "request"
      ? hashStep
      : "policy";

  return (
    <IntegrationStudioStageProvider stage={studioStage}>
      <AbxInstitutionalWorkspaceShell className="abx-studio-workspace" aria-label="Integration Studio workspace">
        <nav className="abx-studio-workspace__nav" aria-label="Integration lifecycle">
          {STEPS.map((step, index) => {
            const active =
              step.id === hashStep
              || (step.id === "policy" && pathname === "/developers/integration-studio" && hashStep === "policy");
            return (
              <Link
                key={step.id}
                href={step.href}
                onClick={(event) => navigateInStudioStage(step.href, event)}
                className={
                  active
                    ? "abx-studio-workspace__nav-item abx-studio-workspace__nav-item--active"
                    : "abx-studio-workspace__nav-item"
                }
                aria-current={active ? "step" : undefined}
              >
                <span className="sr-only">Step {index + 1}: </span>
                {step.label}
              </Link>
            );
          })}
        </nav>
        <div className="abx-studio-workspace__main">
          <div className="abx-studio-workspace__guide">
            <IntegrationStudioStageGuide stageId={studioStage} />
          </div>
          <div className="abx-studio-workspace__canvas">{children}</div>
          {inspector ? <aside className="abx-studio-workspace__inspector">{inspector}</aside> : null}
        </div>
      </AbxInstitutionalWorkspaceShell>
    </IntegrationStudioStageProvider>
  );
}
