import type { Metadata } from "next";
import { PassportSeoFallback } from "@/components/passport/PassportSeoFallback";

export const metadata: Metadata = {
  title: "Abraxas Passport — Verify once, reuse everywhere",
  description:
    "Prove what you control. Partners check only what you approve — minimum proof, consent receipts, reusable trust.",
  openGraph: {
    title: "Abraxas Passport",
    description:
      "Sign in with Google, bind your wallet, approve what gets shared. Verification that compounds — not another document upload.",
    type: "website",
  },
};

export default function PassportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PassportSeoFallback />
      {children}
    </>
  );
}
