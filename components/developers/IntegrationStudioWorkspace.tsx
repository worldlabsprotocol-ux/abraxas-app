"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STEPS = [
  { id: "policy", label: "Policy", href: "/developers/integration-studio" },
  { id: "sandbox", label: "Sandbox", href: "/developers/integration-studio#sandbox" },
  { id: "request", label: "Request", href: "/developers/integration-studio#request" },
  { id: "receipt", label: "Receipt", href: "/verify?mode=receipt" },
  { id: "verify", label: "Verification", href: "/verify" },
  { id: "production", label: "Production review", href: "/developers/launchpad" },
] as const;

function activeStepFromHash(hash: string): string {
  if (hash === "#sandbox") return "sandbox";
  if (hash === "#request") return "request";
  return "policy";
}

export function IntegrationStudioWorkspace({
  inspector,
  children,
}: {
  inspector?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [hashStep, setHashStep] = useState("policy");

  useEffect(() => {
    const sync = () => setHashStep(activeStepFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <div className="abx-studio-workspace">
      <nav className="abx-studio-workspace__nav" aria-label="Integration lifecycle">
        {STEPS.map((step) => {
          const active =
            step.id === hashStep
            || (step.id === "policy" && pathname === "/developers/integration-studio" && hashStep === "policy");
          return (
            <Link
              key={step.id}
              href={step.href}
              className={
                active
                  ? "abx-studio-workspace__nav-item abx-studio-workspace__nav-item--active"
                  : "abx-studio-workspace__nav-item"
              }
              aria-current={active ? "step" : undefined}
            >
              {step.label}
            </Link>
          );
        })}
      </nav>
      <div className="abx-studio-workspace__main">
        <div className="abx-studio-workspace__canvas">{children}</div>
        {inspector ? <aside className="abx-studio-workspace__inspector">{inspector}</aside> : null}
      </div>
    </div>
  );
}
