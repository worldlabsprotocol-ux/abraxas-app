"use client";
// FILE: components/home/HomeProtocolInAction.tsx
// Protocol in Action — three proofs + Passport connector with compact partner media.

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

function ProofMediaMark({ media }: { media: ProtocolProofLogo }) {
  const slotHeight = media.slotHeight ?? PROTOCOL_PROOF_LOGO_HEIGHT;
  const fit = media.fit ?? "contain";
  const containScale = media.containScale ?? 1;

  if (fit === "contain") {
    return (
      <div
        className="abx-home-proof-media abx-home-proof-media--contain"
        style={{ height: slotHeight }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt}
          style={{
            maxHeight: slotHeight - 6,
            maxWidth: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            display: "block",
            transform: containScale !== 1 ? `scale(${containScale})` : undefined,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="abx-home-proof-media abx-home-proof-media--cover"
      style={{ height: slotHeight }}
    >
      <Image
        src={media.src}
        alt={media.alt}
        fill
        sizes="(min-width: 900px) 33vw, 100vw"
        style={{
          objectFit: "cover",
          objectPosition: media.objectPosition ?? "center",
          transform: "scale(1.12)",
        }}
      />
    </div>
  );
}

function ProofCard({ proof }: { proof: ProtocolProof }) {
  const media = PROTOCOL_PROOF_LOGOS[proof.id];
  return (
    <Link
      href={proof.href}
      style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}
    >
      <article className="abx-home-proof-card">
        {media ? <ProofMediaMark media={media} /> : null}
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
  const passportMedia = PROTOCOL_PROOF_LOGOS.passport;

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
          {passportMedia ? <ProofMediaMark media={passportMedia} /> : null}
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
