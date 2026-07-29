"use client";
// FILE: components/home/HomeProtocolInAction.tsx
// Protocol in Action — three proofs + Passport connector with partner logos.

import Image from "next/image";
import Link from "next/link";
import {
  PROTOCOL_IN_ACTION_PROOFS,
  PROTOCOL_PASSPORT_CONNECTOR,
  type ProtocolProof,
} from "@/lib/home/ecosystemContent";
import {
  PROTOCOL_PROOF_LOGOS,
  PROTOCOL_PROOF_LOGO_HEIGHT,
  type ProtocolProofLogo,
} from "@/lib/home/protocolProofLogos";

const LOGO_SLOT_HEIGHT = 52;

function ProofLogoMark({ logo }: { logo: ProtocolProofLogo }) {
  return (
    <div
      style={{
        height: LOGO_SLOT_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.5rem 1rem 0.15rem",
        flexShrink: 0,
      }}
    >
      <Image
        src={logo.src}
        alt={logo.alt}
        width={160}
        height={PROTOCOL_PROOF_LOGO_HEIGHT}
        style={{
          width: "auto",
          height: PROTOCOL_PROOF_LOGO_HEIGHT,
          maxWidth: "75%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

function ProofCard({ proof }: { proof: ProtocolProof }) {
  const logo = PROTOCOL_PROOF_LOGOS[proof.id];
  return (
    <Link
      href={proof.href}
      style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}
    >
      <article className="abx-home-proof-card">
        {logo ? <ProofLogoMark logo={logo} /> : null}
        <div style={{ padding: "0.65rem 1rem 1rem", flex: 1 }}>
          <div className="abx-home-proof-eyebrow">{proof.category}</div>
          <h3 className="abx-home-proof-title">{proof.title}</h3>
          <p className="abx-home-proof-summary">{proof.summary}</p>
          <p className="abx-home-proof-body">{proof.demonstrates}</p>
        </div>
      </article>
    </Link>
  );
}

export function HomeProtocolInAction() {
  const passport = PROTOCOL_PASSPORT_CONNECTOR;
  const passportLogo = PROTOCOL_PROOF_LOGOS.passport;

  return (
    <section aria-labelledby="home-protocol-in-action-heading" id="ecosystem" className="abx-home-section-center" style={{ width: "100%" }}>
      <div className="abx-home-intro">
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Abraxas in three proofs
        </div>
        <h2 id="home-protocol-in-action-heading" className="abx-home-section-title">
          Protocol in action
        </h2>
        <p className="abx-home-section-lead">
          Real implementations, not hypothetical examples. Each partner demonstrates a different
          capability of reusable trust infrastructure.
        </p>
      </div>

      <div className="abx-home-proof-grid">
        {PROTOCOL_IN_ACTION_PROOFS.map((proof) => (
          <ProofCard key={proof.id} proof={proof} />
        ))}
      </div>

      <Link href={passport.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <article className="abx-home-passport-connector">
          {passportLogo ? <ProofLogoMark logo={passportLogo} /> : null}
          <div style={{ padding: "0 1rem 1rem" }}>
            <h3 className="abx-home-proof-title">{passport.title}</h3>
            <p className="abx-home-proof-summary">{passport.summary}</p>
            <p className="abx-home-proof-body" style={{ color: "var(--text-secondary)" }}>
              {passport.demonstrates}
            </p>
          </div>
        </article>
      </Link>
    </section>
  );
}
