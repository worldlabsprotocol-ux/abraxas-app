// FILE: components/SessionProvider.tsx
// Wraps the app with NextAuth SessionProvider.
// Must wrap SolanaProvider in app/layout.tsx or providers.tsx.
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export function SessionProvider({
  children,
  session,
}: {
  children:  React.ReactNode;
  session?:  Session | null;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
