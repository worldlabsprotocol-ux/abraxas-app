"use client";

import { useToast } from "@/lib/toastState";

export function Toast() {
  const { message, visible } = useToast();

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-bg-3 border border-gold text-abraxas-text text-sm px-6 py-3 rounded-lg transition-all duration-300 whitespace-nowrap ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      {message}
    </div>
  );
}
