"use client";
// FILE: components/demo/referenceContentPublisher/ReferencePublisherCallbackClient.tsx
// Return to publisher after Abraxas proof — server verifies receipt before publication.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { REFERENCE_PUBLISHER_ROUTE } from "@/lib/demo/referenceContentPublisher/contract";

const SANS = "'Inter', system-ui, sans-serif";

interface VerifyResponse {
  ok?: boolean;
  published?: boolean;
  errors?: string[];
  provenance?: {
    creator_attested: boolean;
    ai_assistance_disclosed: string;
    source_integrity_verified: boolean;
  };
  draft?: {
    title?: string;
    state?: string;
  };
}

export function ReferencePublisherCallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Verifying provenance result…");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    void fetch("/api/demo/reference-publisher/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: query ? `?${query}` : "" }),
      credentials: "same-origin",
    })
      .then(async (res) => {
        const data = await res.json() as VerifyResponse;
        setResult(data);
        if (!res.ok || !data.ok) {
          throw new Error(data.errors?.join(", ") ?? "Verification failed");
        }
        setStatus("Provenance verified. Returning to your article…");
        setTimeout(() => {
          router.replace(`${REFERENCE_PUBLISHER_ROUTE}?published=1`);
        }, 1200);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Verification failed");
        setStatus("Publication could not complete.");
      });
  }, [searchParams, router]);

  return (
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.25rem", fontFamily: SANS }}>
      <p style={{ fontSize: "0.72rem", letterSpacing: "0.1em", color: "#78716c" }}>RETURNING TO PUBLISHER</p>
      <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem", margin: "0.5rem 0" }}>
        {result?.ok ? "Publication authorized" : "Checking proof"}
      </h1>
      <p style={{ color: "#57534e", lineHeight: 1.6 }}>{status}</p>
      {result?.provenance ? (
        <ul style={{ fontSize: "0.85rem", color: "#44403c", lineHeight: 1.7, paddingLeft: "1.1rem" }}>
          <li>Creator attested (L0 attestation)</li>
          <li>AI assistance: {result.provenance.ai_assistance_disclosed.replace(/_/g, " ")} (L0 disclosure)</li>
          <li>Source integrity verified (L1 integrity)</li>
        </ul>
      ) : null}
      {error ? (
        <>
          <p style={{ color: "#b91c1c", fontSize: "0.88rem" }}>{error}</p>
          <p style={{ marginTop: "1rem" }}>
            <Link href={REFERENCE_PUBLISHER_ROUTE}>Back to draft</Link>
          </p>
        </>
      ) : null}
    </main>
  );
}
