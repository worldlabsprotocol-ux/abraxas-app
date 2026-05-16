// FILE: components/StoreHydrator.tsx
// Deterministic Zustand rehydration — solves SSR/CSR mismatch.
// Mount once in layout.tsx. Required for skipHydration stores.
"use client";
import { useEffect } from "react";
import { useAbraStore } from "@/lib/abraxasStore";

export function StoreHydrator() {
  useEffect(() => {
    useAbraStore.persist.rehydrate();
  }, []);
  return null;
}