// FILE: app/try/page.tsx
// Public product preview. No holder or partner authentication is required.

import type { Metadata } from "next";
import { ProtocolPage } from "@/components/ProtocolPage";
import { TryAbraxasClient } from "./TryAbraxasClient";

export const metadata: Metadata = {
  title: "Try Abraxas | Private policy integration",
  description: "Choose a real Abraxas policy, inspect its privacy boundary, and preview the server integration without signing in.",
};

export default function TryAbraxasPage() {
  return (
    <ProtocolPage maxWidth={1040}>
      <TryAbraxasClient />
    </ProtocolPage>
  );
}
