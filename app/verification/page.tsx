// FILE: app/verification/page.tsx
import { notFound } from "next/navigation";
import { isPublicProductProduction } from "@/lib/product/publicOrigin";
import { VerificationDashboard } from "./VerificationDashboard";

export const dynamic = "force-dynamic";

export default function VerificationPage() {
  if (isPublicProductProduction()) {
    notFound();
  }
  return <VerificationDashboard />;
}
