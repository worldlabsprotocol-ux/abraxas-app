"use client";
// FILE: app/case-studies/chickasaw-project/page.tsx

import { ChickasawProjectCaseStudy } from "@/components/case-studies/ChickasawProjectCaseStudy";
import { WalletContextProvider } from "@/components/WalletContextProvider";

export default function ChickasawProjectPage() {
  return (
    <WalletContextProvider>
      <ChickasawProjectCaseStudy />
    </WalletContextProvider>
  );
}
