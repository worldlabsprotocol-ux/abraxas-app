// FILE: components/StoreHydrator.tsx
// Rehydrates the Zustand persist store on the client after mount.
// Prevents server/client mismatch from localStorage values.
// Must be rendered inside the app layout as a client component.
"use client";
"use client";

import { useEffect } from "react";
import { useAbraStore } from "@/lib/abraxasStore";

export function StoreHydrator() {
  useEffect(() => {
    // Manual rehydration after mount — skipHydration: true means we do this explicitly
    // so server always renders the default state
    useAbraStore.persist.rehydrate();
  }, []);
  return null;
}