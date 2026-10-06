"use client";
// FILE: app/admin/production-review/page.tsx

export const dynamic = "force-dynamic";

import { ProductionReviewControlPlane } from "@/components/admin/ProductionReviewControlPlane";

export default function AdminProductionReviewPage() {
  return <ProductionReviewControlPlane />;
}
