"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Next.js 14: params is a plain object
export default function LegacyAssetPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  useEffect(() => {
    router.replace(`/vault/${id}`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center py-32 text-abraxas-subtle text-sm">
      Redirecting…
    </div>
  );
}
