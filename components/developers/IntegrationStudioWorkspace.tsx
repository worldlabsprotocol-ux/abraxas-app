"use client";

import type { ReactNode } from "react";
import Link from "next/link";

const STEPS = [
  { id: "policy", label: "Policy", href: "/developers/integration-studio" },
  { id: "sandbox", label: "Sandbox", href: "/developers/integration-studio#sandbox" },
  { id: "request", label: "Request", href: "/developers/integration-studio#request" },
  { id: "receipt", label: "Receipt", href: "/verify?mode=receipt" },
  { id: "verify", label: "Verification", href: "/verify" },
  { id: "production", label: "Production review", href: "/developers/launchpad" },
] as const;

export function IntegrationStudioWorkspace({
  inspector,
  children,
}: {
  inspector?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="abx-studio-workspace">
      <nav className="abx-studio-workspace__nav" aria-label="Integration lifecycle">
        {STEPS.map((step) => (
          <Link key={step.id} href={step.href} className="abx-studio-workspace__nav-item">
            {step.label}
          </Link>
        ))}
      </nav>
      <div className="abx-studio-workspace__main">
        <div className="abx-studio-workspace__canvas">{children}</div>
        {inspector ? <aside className="abx-studio-workspace__inspector">{inspector}</aside> : null}
      </div>
    </div>
  );
}
