"use client";
// FILE: lib/hooks/useAdminIdentityPendingCount.ts

import { useQuery } from "@tanstack/react-query";
import { shouldFetchAdminIdentityPendingCount } from "@/lib/admin/adminIdentityNav";

interface PendingCountResponse {
  pending_count: number;
}

export function useAdminIdentityPendingCount(isAdmin: boolean) {
  const enabled = shouldFetchAdminIdentityPendingCount(isAdmin);

  const query = useQuery({
    queryKey: ["admin", "identity", "pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/admin/identity/pending-count");
      if (res.status === 401) return null;
      if (!res.ok) return null;
      const data = await res.json() as PendingCountResponse;
      return data.pending_count ?? 0;
    },
    enabled,
    staleTime: 60_000,
  });

  return {
    pendingCount: enabled ? (query.data ?? null) : null,
    isLoading: enabled && query.isLoading,
  };
}
