// FILE: components/home/HomeTrustContinuousArchitectureImage.tsx
// Canonical "Trust is continuous" architecture visual (maintainable asset in /public/home).

import Image from "next/image";

const ARCHITECTURE_SRC = "/home/abraxas-trust-is-continuous-architecture.png";

export function HomeTrustContinuousArchitectureImage({ priority = false }: { priority?: boolean }) {
  return (
    <figure className="abx-trust-continuous-arch" aria-labelledby="abx-trust-continuous-arch-title">
      <figcaption className="abx-trust-continuous-arch__caption">
        <p className="abx-v2-eyebrow">02 · How Abraxas works</p>
        <h2 id="abx-trust-continuous-arch-title" className="abx-trust-continuous-arch__title">
          Trust is continuous.
        </h2>
        <p className="abx-trust-continuous-arch__lead">
          From request to enforcement: evidence, authority, signed decision, independent verification, and
          continuity—without replacing your custody or access-control systems.
        </p>
      </figcaption>
      <div className="abx-trust-continuous-arch__scroll">
        <Image
          src={ARCHITECTURE_SRC}
          alt="Abraxas trust architecture: request, signed decision, independent verification, application enforcement, and ongoing continuity."
          width={2400}
          height={1350}
          className="abx-trust-continuous-arch__image"
          priority={priority}
          sizes="(max-width: 768px) 120vw, 1180px"
        />
      </div>
    </figure>
  );
}
