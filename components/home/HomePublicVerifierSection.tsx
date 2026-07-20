"use client";
// FILE: components/home/HomePublicVerifierSection.tsx
// Interactive public verifier — second thing on the landing page.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/redesign/ui";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";

const SAMPLE_ID = FLAGSHIP_PROPERTY.id;

export function HomePublicVerifierSection() {
  const router = useRouter();
  const [query, setQuery] = useState(SAMPLE_ID);
  const [busy, setBusy] = useState(false);

  function verify() {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    router.push(`/verify/${encodeURIComponent(q)}`);
  }

  return (
    <section id="verifier" aria-labelledby="verifier-heading" className="pr-section pr-section-border">
      <span className="pr-label">Public verifier</span>
      <h2 id="verifier-heading" className="pr-h2">
        Anyone pastes a proof ID. No account. No Abraxas login.
      </h2>
      <p className="pr-body">
        Look up a registry record or credential identifier. The response is machine-readable — suitable for humans and autonomous agents.
      </p>

      <div className="pr-verifier-box">
        <label htmlFor="home-verifier-input" className="pr-sr-only">
          Record or asset identifier
        </label>
        <input
          id="home-verifier-input"
          className="pr-verifier-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
          placeholder="ABX-RE-HOSP-001"
          spellCheck={false}
          autoComplete="off"
        />
        <Btn onClick={verify} loading={busy} ariaLabel="Verify identifier">
          Verify
        </Btn>
      </div>

      <p className="pr-trust-line">
        They verify the math, not your reputation.
      </p>
    </section>
  );
}
