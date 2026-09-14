"use client";
// FILE: components/auth/AuthStatusPanel.tsx
// Shared loading and error states for authentication transient pages.

import Link from "next/link";
import { AbxAlert, AbxCard } from "@/components/design/AbxPrimitives";
import { AbxInnerPage } from "@/components/design/AbxInnerPage";
import { AbxLoadingPanel } from "@/components/design/AbxPrimitives";
import { Btn } from "@/components/redesign/ui";

export interface AuthStatusPanelProps {
  title: string;
  description?: string;
  status: "loading" | "error" | "info";
  errorMessage?: string;
  actionHref?: string;
  actionLabel?: string;
}

export function AuthStatusPanel({
  title,
  description,
  status,
  errorMessage,
  actionHref = "/passport",
  actionLabel = "Go to Passport",
}: AuthStatusPanelProps) {
  return (
    <AbxInnerPage accent="passport" title={title} lead={description} align="center" maxWidth={420}>
      <AbxCard accent="passport" style={{ textAlign: "center" }}>
        {status === "loading" && <AbxLoadingPanel label={title} />}
        {status === "info" && description && (
          <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
        {status === "error" && (
          <>
            <AbxAlert tone="error" title="Sign in could not be completed">
              {errorMessage ?? "Something went wrong. Try again from Passport."}
            </AbxAlert>
            <div style={{ marginTop: "1rem" }}>
              <Btn href={actionHref}>{actionLabel}</Btn>
            </div>
          </>
        )}
        {status === "info" && actionHref && (
          <div style={{ marginTop: "1rem" }}>
            <Link href={actionHref} style={{ color: "var(--abx-accent)", fontWeight: 600, textDecoration: "none", fontSize: "0.84rem" }}>
              {actionLabel}
            </Link>
          </div>
        )}
      </AbxCard>
    </AbxInnerPage>
  );
}
