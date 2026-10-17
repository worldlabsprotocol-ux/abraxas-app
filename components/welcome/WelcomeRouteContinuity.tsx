"use client";
// FILE: components/welcome/WelcomeRouteContinuity.tsx
// Deep link compatibility: /welcome → primary homepage sandbox chapter (single landing).

import { useEffect } from "react";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";

export function WelcomeRouteContinuity() {
  useEffect(() => {
    const target = "/#start-sandbox";
    if (typeof window !== "undefined" && window.location.pathname === "/welcome") {
      window.location.replace(target);
    }
  }, []);

  return <RedesignPageLoading label="Opening Abraxas sandbox entry…" />;
}
