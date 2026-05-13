// FILE: components/StoreHydrator.tsx
// Rehydrates Zustand persist store client-side after mount.
// Prevents server/client mismatch from localStorage values.
"use client";
"use client";
import { useEffect } from "react";
import { useAbraStore } from "@/lib/abraxasStore";
export function StoreHydrator() {
  useEffect(() => { useAbraStore.persist.rehydrate(); }, []);
  return null;
}