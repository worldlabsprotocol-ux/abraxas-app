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
import { buildIntegrationStageUrl } from "@/lib/developers/unifiedWorkspaceContinuity";
import { useUnifiedWorkspaceEmbed } from "@/lib/developers/unifiedWorkspaceEmbedContext";

function buildStudioSteps(input: {
  basePath: string;
  query: Record<string, string>;
}): Array<{ id: IntegrationStudioStageId | "receipt" | "verify" | "production"; label: string; href: string }> {
  return [
    { id: "policy", label: "Policy", href: buildIntegrationStageUrl({ basePath: input.basePath, stage: "policy", query: input.query }) },
    { id: "sandbox", label: "Sandbox", href: buildIntegrationStageUrl({ basePath: input.basePath, stage: "sandbox", query: input.query }) },
    { id: "configuration", label: "Configuration", href: buildIntegrationStageUrl({ basePath: input.basePath, stage: "configuration", query: input.query }) },
    { id: "request", label: "Request", href: buildIntegrationStageUrl({ basePath: input.basePath, stage: "request", query: input.query }) },
    { id: "receipt", label: "Receipt", href: buildIntegrationStageUrl({ basePath: input.basePath, stage: "receipt", query: input.query }) },
    { id: "verify", label: "Verification", href: buildIntegrationStageUrl({ basePath: input.basePath, stage: "verify", query: input.query }) },
    { id: "production", label: "Production review", href: buildIntegrationStageUrl({ basePath: input.basePath, stage: "production", query: input.query }) },
  ];
}

function activeStepFromHash(hash: string): IntegrationStudioStageId | "receipt" | "verify" | "production" {
  if (hash === "#sandbox") return "sandbox";
  if (hash === "#configuration") return "configuration";
  if (hash === "#request") return "request";
  return integrationStudioStageFromHash(hash);
}

export function IntegrationStudioWorkspace({
  inspector,
  beginnerSurface = false,
  children,
}: {
  inspector?: ReactNode;
  beginnerSurface?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { embeddedInDeveloperWorkspace, workspaceBasePath, preservedQuery } = useUnifiedWorkspaceEmbed();
  const homepageStudioEmbed = embeddedInDeveloperWorkspace && workspaceBasePath === "/";
  const STEPS = buildStudioSteps({ basePath: workspaceBasePath, query: preservedQuery });
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

  function navigateInStudioStage(stepId: string, href: string, event: MouseEvent) {
    if (pathname !== workspaceBasePath) return;
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) {
      if (stepId === "policy") {
        event.preventDefault();
        const qs = new URLSearchParams(preservedQuery).toString();
        const target = `${workspaceBasePath}${qs ? `?${qs}` : ""}`;
        if (window.location.pathname + window.location.search !== target || window.location.hash) {
          window.history.replaceState(null, "", target);
        }
        setHashStep("policy");
      }
      return;
    }
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
      <AbxInstitutionalWorkspaceShell
        className={
          [
            "abx-studio-workspace",
            embeddedInDeveloperWorkspace ? "abx-studio-workspace--embedded" : "",
            homepageStudioEmbed ? "abx-studio-workspace--homepage" : "",
            beginnerSurface ? "abx-studio-workspace--beginner" : "",
          ]
            .filter(Boolean)
            .join(" ")
        }
        aria-label="Integration Studio workspace"
      >
        {!embeddedInDeveloperWorkspace && !beginnerSurface ? (
        <nav className="abx-studio-workspace__nav" aria-label="Integration lifecycle">
          {STEPS.map((step, index) => {
            const active =
              step.id === hashStep
              || (step.id === "policy" && pathname === workspaceBasePath && hashStep === "policy");
            return (
              <Link
                key={step.id}
                href={step.href}
                onClick={(event) => navigateInStudioStage(step.id, step.href, event)}
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
        ) : null}
        <div className="abx-studio-workspace__main">
          {!embeddedInDeveloperWorkspace ? (
          <div className="abx-studio-workspace__guide">
            <IntegrationStudioStageGuide stageId={studioStage} />
          </div>
          ) : null}
          <div className="abx-studio-workspace__canvas">{children}</div>
          {inspector ? <aside className="abx-studio-workspace__inspector">{inspector}</aside> : null}
        </div>
      </AbxInstitutionalWorkspaceShell>
    </IntegrationStudioStageProvider>
  );
}
