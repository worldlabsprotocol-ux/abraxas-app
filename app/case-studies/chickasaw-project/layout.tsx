"use client";
// FILE: app/case-studies/chickasaw-project/layout.tsx

import { AbxSectionLayout } from "@/components/design/AbxSectionLayout";

export default function ChickasawCaseStudyLayout({ children }: { children: React.ReactNode }) {
  return <AbxSectionLayout accent="home" maxWidth={920}>{children}</AbxSectionLayout>;
}
