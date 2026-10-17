"use client";

import { useQuery } from "@tanstack/react-query";
import type { AccountOverviewPayload } from "@/lib/account/buildAccountOverview";

export const ACCOUNT_OVERVIEW_QUERY_KEY = "account-overview";

async function fetchAccountOverview(): Promise<AccountOverviewPayload> {
  const res = await fetch("/api/account/overview", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("account_overview_failed");
  return res.json() as Promise<AccountOverviewPayload>;
}

export function useAccountOverview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [ACCOUNT_OVERVIEW_QUERY_KEY],
    queryFn: fetchAccountOverview,
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
  });
}
