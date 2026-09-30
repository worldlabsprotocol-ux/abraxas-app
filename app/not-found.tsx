"use client";

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";

export default function NotFound() {
  return (
    <RedesignPage accent="neutral" maxWidth={640}>
      <PageHeader
        eyebrow="Not found"
        title="This page is not available"
        subtitle="The link may be outdated, mistyped, or moved. Your Passport, partner integrations, and verification flows are still available from the main product paths."
      />
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
        <Btn href="/" size="sm">Back to home</Btn>
        <Btn href="/passport" variant="secondary" size="sm">Open Passport</Btn>
        <Btn href="/developers/integration-studio" variant="ghost" size="sm">Integration Studio</Btn>
      </div>
    </RedesignPage>
  );
}
