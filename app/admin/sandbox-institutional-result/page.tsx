"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { SandboxInstitutionalOperatorResultPanel } from "@/components/admin/SandboxInstitutionalOperatorResultPanel";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";
const MONO = "'JetBrains Mono',monospace";

export default function AdminSandboxInstitutionalResultPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Admin · Operator only
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800 }}>Sandbox institutional test result</h1>
        <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "rgba(255,255,255,0.55)" }}>
          Technical integration fixture for sandbox_institutional_protocol_access v1. Not live KYB.
        </p>
        <Link href="/admin/partner-flow" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
          ← Partner Flow
        </Link>
        <div style={{ marginTop: "1.25rem" }}>
          <SandboxInstitutionalOperatorResultPanel />
        </div>
      </div>
    </div>
  );
}
