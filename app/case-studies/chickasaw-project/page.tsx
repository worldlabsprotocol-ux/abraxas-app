"use client";
// FILE: app/case-studies/chickasaw-project/page.tsx

import { ChickasawProjectCaseStudy } from "@/components/case-studies/ChickasawProjectCaseStudy";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";

export default function ChickasawProjectPage() {
  return (
    <WalletContextProvider>
      <SuiAuthProvider>
        <ChickasawProjectCaseStudy />
      </SuiAuthProvider>
    </WalletContextProvider>
  );
}
