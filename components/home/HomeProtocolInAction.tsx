"use client";
// FILE: components/home/HomeProtocolInAction.tsx
// Protocol in Action — interactive before/after story + live proof cards.

import Image from "next/image";
import Link from "next/link";
import { ProtocolFlowExperience } from "@/components/protocol/ProtocolFlowExperience";
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
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";

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
      <article className="abx-home-proof-card abx-interactive">
        {media ? <ProofMediaMark media={media} /> : null}
        <div style={{ padding: "0.65rem 1rem 1rem", flex: 1 }}>
          <div className="abx-home-proof-eyebrow">{proof.statusLabel} · {proof.category}</div>
          <h3 className="abx-home-proof-title">{proof.title}</h3>
          <p className="abx-home-proof-summary">{proof.summary}</p>
          <p className="abx-home-proof-body">{proof.demonstrates}</p>
          <p className="abx-home-proof-summary" style={{ marginTop: "0.55rem" }}>{proof.actionLabel} →</p>
        </div>
      </article>
    </Link>
  );
}

export function HomeProtocolInAction() {
  const passport = PROTOCOL_PASSPORT_CONNECTOR;
  const passportMedia = PROTOCOL_PROOF_LOGOS.passport;

  return (
    <section
      aria-labelledby="home-protocol-in-action-heading"
      id="ecosystem"
      className="abx-home-section-center"
      style={{ width: "100%", ...abxMotionCssVars() }}
    >
      <div className="abx-home-intro">
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Verify what matters. Reveal nothing else.
        </div>
        <h2 id="home-protocol-in-action-heading" className="abx-home-section-title">
          Protocol in action
        </h2>
        <p className="abx-home-section-lead">
          See how Abraxas differs from traditional verification — then explore working flows wired to real policy definitions.
        </p>
      </div>

      <ProtocolFlowExperience />

      <div className="abx-home-intro" style={{ marginTop: "clamp(2rem, 5vw, 2.75rem)" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Live proofs
        </div>
        <h3 className="abx-home-section-title" style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)" }}>
          Working flows in the product
        </h3>
        <p className="abx-home-section-lead">
          Registry records and case studies are labeled so they are not mistaken for live bookings or payments.
        </p>
      </div>

      <div className="abx-home-proof-grid">
        {PROTOCOL_IN_ACTION_PROOFS.map((proof) => (
          <ProofCard key={proof.id} proof={proof} />
        ))}
      </div>

      <Link href={passport.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <article className="abx-home-passport-connector abx-interactive">
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
