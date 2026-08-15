"use client";
// FILE: components/admin/AdminShell.tsx
// Authorized admin chrome — sidebar, mobile nav, and page content slot.

import { useState, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "#0a0c10",
      color: "#f0f0f0",
    }}>
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AdminPageHeader onMenuToggle={() => setMobileOpen(true)} />
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
