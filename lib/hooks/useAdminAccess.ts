"use client";
// FILE: lib/hooks/useAdminAccess.ts

import { useQuery } from "@tanstack/react-query";

interface AdminAccessResponse {
  authorized: boolean;
  method?: "email" | "pin_header" | "pin_cookie" | null;
  email?: string | null;
}

export function useAdminAccess() {
  const query = useQuery({
    queryKey: ["admin", "access"],
    queryFn: async () => {
      const res = await fetch("/api/admin/access");
      return res.json() as Promise<AdminAccessResponse>;
    },
    staleTime: 60_000,
  });

  return {
    isAdmin: query.data?.authorized ?? false,
    method: query.data?.method ?? null,
    email: query.data?.email ?? null,
    isLoading: query.isLoading,
  };
}
