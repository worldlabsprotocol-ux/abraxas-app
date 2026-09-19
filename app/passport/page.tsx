// FILE: app/passport/page.tsx
import { Suspense } from "react";
import { AccountAccessFirstPaint } from "@/components/product/AccountAccessFirstPaint";
import { PassportPageClient } from "./PassportPageClient";

export default function PassportPage() {
  return (
    <Suspense fallback={<AccountAccessFirstPaint />}>
      <PassportPageClient />
    </Suspense>
  );
}
