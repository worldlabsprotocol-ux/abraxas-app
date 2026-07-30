"use client";
// FILE: components/home/HomePartnerNetwork.tsx
// Partner Network — protocol participants forming around reusable trust (not a sponsor wall).

import Image from "next/image";
import Link from "next/link";
import {
  PARTNER_NETWORK_CARDS,
  PARTNER_NETWORK_SUBTITLE,
  PARTNER_NETWORK_TITLE,
  partnerNetworkStatusEmoji,
  partnerNetworkStatusLabel,
  type PartnerNetworkCard,
} from "@/lib/home/partnerNetwork";

function StatusBadge({ status }: { status: PartnerNetworkCard["status"] }) {
  const isLive = status === "live";
  return (
    <span
      className={`abx-partner-network-badge${isLive ? " abx-partner-network-badge--live" : " abx-partner-network-badge--design"}`}
    >
      <span aria-hidden="true">{partnerNetworkStatusEmoji(status)}</span>
      {partnerNetworkStatusLabel(status)}
    </span>
  );
}

function CardMedia({ image }: { image: NonNullable<PartnerNetworkCard["image"]> }) {
  return (
    <div className="abx-partner-network-card-media">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 900px) 320px, 100vw"
        style={{
          objectFit: "cover",
          objectPosition: image.objectPosition ?? "center",
        }}
      />
    </div>
  );
}

function PartnerCard({ card }: { card: PartnerNetworkCard }) {
  const inner = (
    <article className="abx-partner-network-card">
      {card.image ? <CardMedia image={card.image} /> : null}
      <div className="abx-partner-network-card-body">
        <StatusBadge status={card.status} />
        <h3 className="abx-partner-network-card-title">{card.name}</h3>
        <p className="abx-partner-network-card-description">{card.description}</p>
      </div>
    </article>
  );

  if (!card.href) return inner;

  return (
    <Link href={card.href} className="abx-partner-network-card-link">
      {inner}
    </Link>
  );
}

export function HomePartnerNetwork() {
  return (
    <section
      aria-labelledby="home-partner-network-heading"
      id="partner-network"
      className="abx-home-section-center abx-partner-network"
      style={{ width: "100%" }}
    >
      <div className="abx-home-intro">
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Growing network
        </div>
        <h2 id="home-partner-network-heading" className="abx-home-section-title">
          {PARTNER_NETWORK_TITLE}
        </h2>
        <p className="abx-home-section-lead">{PARTNER_NETWORK_SUBTITLE}</p>
      </div>

      <div className="abx-partner-network-grid">
        {PARTNER_NETWORK_CARDS.map((card) => (
          <PartnerCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
