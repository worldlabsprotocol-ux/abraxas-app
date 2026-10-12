"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";
import { SOLANA_GATE_V2_REVOKED_DIGEST } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { AbxSkeleton } from "@/components/design/AbxPrimitives";

type RegistryPayload = { issuers?: unknown[]; schemas?: unknown[]; error?: string };

export function LiveProtocolEvidence() {
  const [registry, setRegistry] = useState<RegistryPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trust/registry")
      .then(async (r) => (await r.json()) as RegistryPayload)
      .then((data) => {
        if (!cancelled) {
          setRegistry(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRegistry({ error: "unavailable" });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const issuerCount = registry?.issuers?.length;
  const schemaCount = registry?.schemas?.length;

  return (
    <section className="abx-live-evidence" aria-labelledby="live-evidence-heading">
      <p className="abx-v2-eyebrow">Live protocol evidence</p>
      <h2 id="live-evidence-heading" className="abx-v2-section-title">
        Solana devnet trust registry (labeled)
      </h2>
      <p className="abx-v2-section-lead">
        Release metadata and public registry APIs are shown separately. Devnet chain proofs require a finalized transaction
        signature — this panel does not imply continuous on-chain monitoring unless an observer is running.
      </p>

      <div className="abx-live-evidence__grid">
        <EvidenceBlock title="Reviewed gate program (release artifact)">
          <Row label="Program ID" mono value={SOLANA_GATE_V2_RELEASE.program_id} />
          <Row label="Network" value="Solana devnet" />
          <Row label="Registry / gate binding" mono value="See gate_config PDA after operator deploy" />
          <Row label="Last observed finalized state" value="Not continuously observed on this page" />
          <Row label="Observation mode" value="Release metadata + optional RPC proof URL" />
          <Row label="Artifact" mono value={SOLANA_GATE_V2_RELEASE.artifact_id} />
          <Row label="Provenance" mono value={SOLANA_GATE_V2_RELEASE.provenance_ref} />
          <Row label="Live deployment claim" value="Not claimed — release metadata only (live: false)" />
          <details className="abx-live-evidence__details">
            <summary>Raw release digests</summary>
            <pre className="abx-live-evidence__pre">
              {`program_data_digest: ${SOLANA_GATE_V2_RELEASE.program_data_digest}\nelf_sha256: ${SOLANA_GATE_V2_RELEASE.elf_sha256}`}
            </pre>
          </details>
          <Link href="/proofs/solana-devnet" className="abx-live-evidence__link">
            Verify a devnet transaction (explorer signature) →
          </Link>
        </EvidenceBlock>

        <EvidenceBlock title="Public trust registry API">
          {loading ? (
            <>
              <AbxSkeleton height={10} width="55%" />
              <AbxSkeleton height={10} width="70%" style={{ marginTop: 10 }} />
            </>
          ) : registry?.error ? (
            <p className="abx-live-evidence__unavailable" role="status">
              Registry unavailable in this environment ({registry.error}).
            </p>
          ) : (
            <>
              <Row label="Issuers indexed" value={String(issuerCount ?? "—")} />
              <Row label="Schemas indexed" value={String(schemaCount ?? "—")} />
              <Row label="Observation" value="HTTP snapshot at page load — not a chain finality proof" />
              <Link href="/api/trust/registry" className="abx-live-evidence__link">
                Open registry JSON →
              </Link>
            </>
          )}
        </EvidenceBlock>

        <EvidenceBlock title="Control reference — revoked artifact (not live chain)">
          <p className="abx-live-evidence__note">
            Illustrates how independent verification reports DENY when commitment status is REVOKED. This row is a
            source-controlled control digest, not an RPC observation.
          </p>
          <Row label="Commitment status" value="REVOKED" />
          <Row label="Independent verdict" value="DENY" />
          <Row label="Control digest" mono value={SOLANA_GATE_V2_REVOKED_DIGEST} />
          <Row label="Explorer transaction" value="N/A — control fixture only" />
        </EvidenceBlock>
      </div>
    </section>
  );
}

function EvidenceBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="abx-live-evidence__block">
      <h3 className="abx-live-evidence__block-title">{title}</h3>
      {children}
    </article>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="abx-live-evidence__row">
      <span>{label}</span>
      <span className={mono ? "abx-live-evidence__mono" : undefined}>{value}</span>
    </div>
  );
}
