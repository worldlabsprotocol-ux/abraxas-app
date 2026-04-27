"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/** Thin wrapper around next-auth's SessionProvider so we can mark it
    "use client" without forcing the rest of providers.tsx to inherit. */
export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
