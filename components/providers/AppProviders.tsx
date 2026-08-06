"use client";
// FILE: components/providers/AppProviders.tsx

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeContext";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { ZkLoginSignInChooserProvider } from "@/components/sui/ZkLoginSignInChooserProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SuiAuthProvider>
          <ZkLoginSignInChooserProvider>{children}</ZkLoginSignInChooserProvider>
        </SuiAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
