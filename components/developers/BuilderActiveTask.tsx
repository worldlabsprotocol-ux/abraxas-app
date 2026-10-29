"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AbraxasLogo } from "@/components/brand/AbraxasLogo";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";

type TaskState = "ready" | "pending" | "success" | "failure";

/** The one visible beginner task. Workflow state and authorization stay with the caller. */
export function BuilderActiveTask({
  taskKey,
  title,
  description,
  state = "ready",
  status,
  error,
  children,
  action,
  advanced,
  testId,
  manageFocus = true,
}: {
  taskKey: string;
  title: string;
  description?: string;
  state?: TaskState;
  status?: string;
  error?: string | null;
  children?: ReactNode;
  action?: ReactNode;
  advanced?: ReactNode;
  testId?: string;
  manageFocus?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (manageFocus) heading.current?.focus({ preventScroll: true });
  }, [taskKey, manageFocus]);

  return (
    <section className="abx-builder-journey-shell" data-testid={testId} data-homepage-active-task="1">
      <div className="abx-builder-journey-shell__inner abx-builder-active-task">
        {state === "ready" ? (
          <span className="abx-builder-active-task__emblem">
            <AbraxasLogo variant="emblem" emblemOnly emblemSize={44} href="" />
          </span>
        ) : (
          <AbraxasJourneyEmblemStatus
            state={state === "pending" ? "preparing_workspace" : state === "success" ? "verified" : "needs_attention"}
            detail={status}
          />
        )}
        <h2 ref={heading} tabIndex={-1} className="abx-builder-journey-headline">{title}</h2>
        {description ? <p className="abx-builder-journey-support">{description}</p> : null}
        {children}
        {error ? <p className="abx-builder-journey-error" role="alert">{error}</p> : null}
        {action ? <div className="abx-builder-journey-actions">{action}</div> : null}
        {advanced}
      </div>
    </section>
  );
}
