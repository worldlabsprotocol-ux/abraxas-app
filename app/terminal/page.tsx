"use client";
// FILE: app/terminal/page.tsx
// Legacy route — redirects to infrastructure homepage at /

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TerminalPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
