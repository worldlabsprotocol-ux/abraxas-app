"use client";
// FILE: components/home/HomeSharpHero.tsx
// Hero — headline first, then full-width proof photography.

import Image from "next/image";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PROTOCOL_IN_ACTION_PROOFS } from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;

export function HomeSharpHero() {
  return (
    <section
      id="top"
      aria-labelledby="home-hero-heading"
      className="abx-home-hero"
    >
      <div className="abx-home-hero__copy">
        <p className="abx-section-label" style={{ marginBottom: "0.65rem" }}>
          Reusable verification layer
        </p>

        <h1 id="home-hero-heading" className="abx-home-hero__title">
          Verify once. Transact everywhere.
        </h1>

        <p className="abx-home-lead" style={{ marginBottom: "0.45rem", maxWidth: 640 }}>
          Users verify once. Applications consume trusted credentials instead of rebuilding identity flows.
        </p>
        <p style={{
          fontFamily: FONT,
          fontSize: "0.92rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 1.25rem",
          lineHeight: 1.5,
          maxWidth: 640,
        }}>
          Identity becomes portable instead of repetitive.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
          <Btn href="/passport" size="lg">Create Passport</Btn>
          <Btn href="/integrate" variant="secondary" size="lg">Integrate</Btn>
        </div>
      </div>

      <div className="abx-home-hero__proof" aria-label="Live protocol deployments">
        {PROTOCOL_IN_ACTION_PROOFS.map((proof, index) => (
          <Link
            key={proof.id}
            href={proof.href}
            className={`abx-home-hero__proof-link${index === 0 ? " abx-home-hero__proof-link--lead" : ""}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="abx-home-hero__proof-media">
              <Image
                src={proof.image.src}
                alt={proof.image.alt}
                fill
                sizes={index === 0 ? "(min-width: 900px) 66vw, 100vw" : "(min-width: 900px) 33vw, 100vw"}
                priority={index === 0}
                style={{ objectFit: "cover", objectPosition: proof.image.objectPosition ?? "center" }}
              />
              <span className="abx-home-hero__proof-scrim" aria-hidden />
              <span className="abx-home-hero__proof-caption">
                <span className="abx-section-label">{proof.category}</span>
                <span className="abx-home-hero__proof-title">{proof.title}</span>
              </span>
            </span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .abx-home-hero {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          padding: clamp(1.25rem, 4vw, 2.5rem) 0 clamp(0.5rem, 2vw, 1rem);
        }
        .abx-home-hero__title {
          font-family: ${DISPLAY};
          font-size: clamp(2rem, 5.2vw, var(--fs-display));
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.02;
          color: var(--text-primary);
          margin: 0 0 0.85rem;
          max-width: 14ch;
        }
        .abx-home-hero__proof {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          width: 100%;
        }
        @media (min-width: 720px) {
          .abx-home-hero__proof {
            grid-template-columns: 1.35fr 1fr 1fr;
            grid-template-rows: minmax(280px, 42vh) minmax(200px, 28vh);
            gap: 0.75rem;
          }
          .abx-home-hero__proof-link--lead {
            grid-row: 1 / span 2;
          }
        }
        .abx-home-hero__proof-link {
          position: relative;
          display: block;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #0a0a0b;
          min-height: 220px;
        }
        @media (min-width: 720px) {
          .abx-home-hero__proof-link {
            min-height: 0;
          }
        }
        .abx-home-hero__proof-media {
          position: relative;
          display: block;
          width: 100%;
          height: 100%;
          min-height: 220px;
        }
        @media (min-width: 720px) {
          .abx-home-hero__proof-link--lead .abx-home-hero__proof-media {
            min-height: 100%;
          }
        }
        .abx-home-hero__proof-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(4, 5, 10, 0.72) 100%);
        }
        .abx-home-hero__proof-caption {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          padding: 0.85rem 1rem 1rem;
        }
        .abx-home-hero__proof-title {
          font-family: ${FONT};
          font-size: clamp(0.85rem, 1.8vw, 1rem);
          font-weight: 800;
          color: #fafafa;
          letter-spacing: -0.02em;
        }
        .abx-home-hero__proof-caption :global(.abx-section-label) {
          color: rgba(250, 250, 250, 0.72);
        }
      `}</style>
    </section>
  );
}
