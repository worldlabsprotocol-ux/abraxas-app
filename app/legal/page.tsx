// FILE: app/legal/page.tsx
import type { Metadata } from "next";
import { LegalPageView } from "./LegalPageView";

export const metadata: Metadata = {
  title: "Legal overview | Abraxas",
  description: "Legal structures and operational frameworks for Abraxas asset verification and vault programs.",
};

export default function LegalPage() {
  return <LegalPageView />;
}
