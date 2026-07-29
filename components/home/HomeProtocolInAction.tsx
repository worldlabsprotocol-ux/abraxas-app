"use client";
// FILE: components/home/HomeProtocolInAction.tsx
// Protocol in Action — large photographic proof, full content width.

import Image from "next/image";
import Link from "next/link";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  PROTOCOL_IN_ACTION_PROOFS,
  PROTOCOL_PASSPORT_CONNECTOR,
  type ProtocolProof,
} from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

function ProofCard({ proof, featured }: { proof: ProtocolProof; featured?: boolean }) {
  return (
    <Link
      href={proof.href}
      className={featured ? "abx-proof-card abx-proof-card--featured" : "abx-proof-card"}
      style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}
    >
      <article className="abx-proof-card__inner">
        <div className="abx-proof-card__media" aria-hidden>
          <Image
            src={proof.image.src}
            alt={proof.image.alt}
            fill
            priority={featured}
            sizes={featured ? "(min-width: 900px) 60vw, 100vw" : "(min-width: 900px) 35vw, 100vw"}
            style={{ objectFit: "cover", objectPosition: proof.image.objectPosition ?? "center" }}
          />
          <div className="abx-proof-card__scrim" />
          <div className="abx-proof-card__overlay">
            <p className="abx-section-label abx-proof-card__category">{proof.category}</p>
            <h3 className="abx-proof-card__title">{proof.title}</h3>
            <p className="abx-proof-card__summary">{proof.summary}</p>
            <p className="abx-proof-card__detail">{proof.demonstrates}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function HomeProtocolInAction() {
  const [cielo, ...rest] = PROTOCOL_IN_ACTION_PROOFS;
  const passport = PROTOCOL_PASSPORT_CONNECTOR;

  if (!cielo) return null;

  return (
    <section aria-labelledby="home-protocol-in-action-heading" id="ecosystem" className="abx-protocol-in-action">
      <p className="abx-section-label" style={{ marginBottom: "0.5rem" }}>
        Live proof
      </p>
      <h2 id="home-protocol-in-action-heading" className="abx-home-h2" style={{ marginBottom: "0.5rem" }}>
        Protocol in action
      </h2>
      <p className="abx-home-lead" style={{ marginBottom: "1rem", maxWidth: 640 }}>
        Real deployments across hospitality, land, and regulated retail. Evidence, not a portfolio slide.
      </p>

      <div className="abx-proof-mosaic">
        <div className="abx-proof-mosaic__featured">
          <ProofCard proof={cielo} featured />
        </div>
        <div className="abx-proof-mosaic__stack">
          {rest.map((proof) => (
            <ProofCard key={proof.id} proof={proof} />
          ))}
        </div>
      </div>

      <Link href={passport.href} className="abx-passport-connector" style={{ textDecoration: "none", color: "inherit" }}>
        <article>
          <div className="abx-passport-connector__mark" aria-hidden>
            <Image src="/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} />
          </div>
          <div>
            <p className="abx-section-label">Connector</p>
            <h3 className="abx-passport-connector__title">{passport.title}</h3>
            <p className="abx-passport-connector__summary">{passport.summary}</p>
            <p className="abx-passport-connector__detail">{passport.demonstrates}</p>
          </div>
          <span className="abx-passport-connector__arrow" aria-hidden>→</span>
        </article>
      </Link>

      <style jsx>{`
        .abx-protocol-in-action {
          width: 100%;
        }
        .abx-proof-mosaic {
          display: grid;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        @media (min-width: 900px) {
          .abx-proof-mosaic {
            grid-template-columns: 1.2fr 0.8fr;
            grid-template-rows: minmax(520px, 58vh);
            align-items: stretch;
            gap: 0.85rem;
          }
          .abx-proof-mosaic__stack {
            display: grid;
            grid-template-rows: 1fr 1fr;
            gap: 0.85rem;
            min-height: 100%;
          }
        }
        :global(.abx-proof-card__inner) {
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #0a0a0b;
          transition: border-color 0.2s ease;
        }
        :global(.abx-proof-card:hover .abx-proof-card__inner) {
          border-color: var(--border-strong);
        }
        :global(.abx-proof-card__media) {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 280px;
        }
        @media (min-width: 900px) {
          :global(.abx-proof-card--featured .abx-proof-card__media) {
            min-height: min(58vh, 640px);
          }
          :global(.abx-proof-card:not(.abx-proof-card--featured) .abx-proof-card__media) {
            min-height: 0;
          }
        }
        :global(.abx-proof-card__scrim) {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(4, 5, 10, 0.05) 0%,
            rgba(4, 5, 10, 0.35) 45%,
            rgba(4, 5, 10, 0.88) 100%
          );
        }
        :global(.abx-proof-card__overlay) {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          padding: clamp(1rem, 2.5vw, 1.35rem);
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        :global(.abx-proof-card__category) {
          color: rgba(250, 250, 250, 0.72);
        }
        :global(.abx-proof-card__title) {
          font-family: ${FONT};
          font-size: clamp(1rem, 2vw, 1.2rem);
          font-weight: 800;
          color: #fafafa;
          margin: 0;
          letter-spacing: -0.02em;
        }
        :global(.abx-proof-card__summary) {
          font-family: ${FONT};
          font-size: 0.82rem;
          font-weight: 600;
          color: rgba(250, 250, 250, 0.92);
          margin: 0;
        }
        :global(.abx-proof-card__detail) {
          font-family: ${FONT};
          font-size: 0.76rem;
          color: rgba(212, 212, 216, 0.88);
          margin: 0;
          line-height: 1.5;
          max-width: 52ch;
        }
        .abx-passport-connector article {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 1rem;
          align-items: center;
          padding: 1rem 1.15rem;
          border-radius: 14px;
          border: 1px solid var(--border-strong);
          background: var(--surface);
        }
        .abx-passport-connector__mark {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: var(--surface-raised);
          border: 1px solid var(--border);
        }
        .abx-passport-connector__title {
          font-family: ${FONT};
          font-size: 0.92rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.2rem;
        }
        .abx-passport-connector__summary {
          font-family: ${FONT};
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.15rem;
        }
        .abx-passport-connector__detail {
          font-family: ${MONO};
          font-size: 0.68rem;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.45;
        }
        .abx-passport-connector__arrow {
          font-family: ${MONO};
          font-size: 1.1rem;
          color: var(--accent);
          font-weight: 700;
        }
        @media (max-width: 599px) {
          .abx-passport-connector article {
            grid-template-columns: auto 1fr;
          }
          .abx-passport-connector__arrow {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
