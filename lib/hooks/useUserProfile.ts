"use client";
// FILE: lib/hooks/useUserProfile.ts
// Load public profile by Sui address — nav, account, verify profile tab.

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";

export const PROFILE_QUERY_KEY = "user-profile";

export interface UserProfile {
  wallet_address: string;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
  bio?: string | null;
  avatar_color?: string | null;
}

async function fetchProfile(sui: string): Promise<UserProfile | null> {
  const res = await fetch(`/api/profile/upsert?sui=${encodeURIComponent(sui)}`);
  if (!res.ok) return null;
  const data = await res.json() as { profile?: UserProfile | null };
  return data.profile ?? null;
}

export function notifyProfileUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("abraxas:profile-updated"));
  }
}

export function useUserProfile() {
  const auth = useSuiAuthOptional();
  const sui = auth?.suiAddress ?? null;
  const qc = useQueryClient();

  useEffect(() => {
    const handler = () => {
      if (sui) void qc.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, sui] });
    };
    window.addEventListener("abraxas:profile-updated", handler);
    return () => window.removeEventListener("abraxas:profile-updated", handler);
  }, [sui, qc]);

  return useQuery({
    queryKey: [PROFILE_QUERY_KEY, sui],
    queryFn: () => fetchProfile(sui!),
    enabled: Boolean(sui),
    staleTime: 30_000,
  });
}

export function profileNavLabel(profile: UserProfile | null | undefined, email: string | null): string {
  if (profile?.display_name) return profile.display_name;
  if (profile?.username) return `@${profile.username}`;
  if (email) return email.split("@")[0] ?? "Account";
  return "Account";
}

export function profileInitial(profile: UserProfile | null | undefined, email: string | null): string {
  const base = profile?.display_name || profile?.username || email || "A";
  return base.charAt(0).toUpperCase();
}
