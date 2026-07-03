import { Suspense } from "react";
import { RedesignHome } from "@/components/redesign/RedesignHome";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <RedesignHome />
    </Suspense>
  );
}
