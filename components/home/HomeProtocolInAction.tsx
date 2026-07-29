"use client";
// FILE: components/home/HomeProtocolInAction.tsx
// Protocol in Action — three proofs + Passport connector with subtle asset photography.

import Image from "next/image";
import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  PROTOCOL_IN_ACTION_PROOFS,
  PROTOCOL_PASSPORT_CONNECTOR,
  type ProtocolProof,
} from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";
const PHOTO_HEIGHT = 56;

function ProofPhotoStrip({ proof }: { proof: ProtocolProof }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: PHOTO_HEIGHT,
        flexShrink: 0,
        background: "#0a0a0b",
      }}
    >
      <Image
        src={proof.image.src}
        alt=""
        fill
        sizes="(min-width: 900px) 33vw, 100vw"
        style={{
          objectFit: "cover",
          objectPosition: proof.image.objectPosition ?? "center",
          opacity: 0.88,
        }}
      />
      <PhotoFade />
    </div>
  );
}

function PhotoFade() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, transparent 0%, var(--surface-raised) 100%)",
        pointerEvents: "none",
      }}
    />
  );
}

function ProofCard({ proof }: { proof: ProtocolProof }) {
  return (
    <Link
      href={proof.href}
      style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}
    >
      <article
        style={{
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-strong)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ProofPhotoStrip proof={proof} />
        <div style={{ padding: "0.85rem 1.05rem 1rem", flex: 1 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: "0.45rem",
            }}
          >
            {proof.category}
          </div>
          <h3
            style={{
              fontFamily: FONT,
              fontSize: "0.9rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 0.35rem",
            }}
          >
            {proof.title}
          </h3>
          <p
            style={{
              fontFamily: FONT,
              fontSize: "0.78rem",
              color: "var(--text-primary)",
              margin: "0 0 0.35rem",
              fontWeight: 600,
            }}
          >
            {proof.summary}
          </p>
          <p
            style={{
              fontFamily: FONT,
              fontSize: "0.74rem",
              color: "var(--text-muted)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {proof.demonstrates}
          </p>
        </div>
      </article>
    </Link>
  );
}

export function HomeProtocolInAction() {
  const passport = PROTOCOL_PASSPORT_CONNECTOR;

  return (
    <section aria-labelledby="home-protocol-in-action-heading" id="ecosystem" >
      <div className="abx-home-intro">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Abraxas in three proofs
      </div>
      <h2
        id="home-protocol-in-action-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        Protocol in action
      </h2>
      <p className="abx-home-section-lead">
        Real implementations, not hypothetical examples. Each partner demonstrates a different
        capability of reusable trust infrastructure.
      </p>

      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
        {PROTOCOL_IN_ACTION_PROOFS.map((proof) => (
          <ProofCard key={proof.id} proof={proof} />
        ))}
      </div>

      <Link
        href={passport.href}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <article
          style={{
            padding: "1rem 1.15rem",
            borderRadius: 12,
            background: `linear-gradient(135deg, ${ACCENT}10 0%, rgba(167,139,250,0.06) 100%)`,
            border: `1px solid ${ACCENT}33`,
          }}
        >
          <h3 style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
            {passport.title}
          </h3>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-primary)", margin: "0 0 0.25rem", fontWeight: 600 }}>
            {passport.summary}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            {passport.demonstrates}
          </p>
        </article>
      </Link>
    </section>
  );
}
