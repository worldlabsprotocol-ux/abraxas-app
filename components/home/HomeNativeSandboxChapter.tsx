"use client";
// FILE: components/home/HomeNativeSandboxChapter.tsx
// Native passkey sandbox entry embedded in the premium homepage — not a generic auth dashboard.

import Link from "next/link";
import { WelcomeStartSandboxFlow } from "@/components/account/WelcomeStartSandboxFlow";
import { AbraxasHeroCenterpiece } from "@/components/home/defi/AbraxasHeroCenterpiece";
import { HomeTrustPipelineStrip } from "@/components/home/defi/HomeTrustPipelineStrip";

export function HomeNativeSandboxChapter() {
  return (
    <section
      id="start-sandbox"
      className="abx-native-sandbox-chapter"
      aria-labelledby="home-sandbox-heading"
    >
      <div className="abx-native-sandbox-chapter__intro">
        <p className="abx-v2-eyebrow">Developer entry</p>
        <h2 id="home-sandbox-heading" className="abx-v2-section-title">
          Start your sandbox when you are ready
        </h2>
        <p className="abx-v2-section-lead abx-v2-section-lead--tight">
          Create a passkey account when you need an authorized tenant sandbox — explore first, sign in only when required.
        </p>
      </div>

      <div className="abx-native-sandbox-chapter__layout">
        <div className="abx-native-sandbox-chapter__visual" aria-hidden="false">
          <div className="abx-native-sandbox-chapter__emblem-wrap">
            <AbraxasHeroCenterpiece />
          </div>
          <HomeTrustPipelineStrip />
        </div>

        <div className="abx-native-sandbox-chapter__panel">
          <Link className="abx-premium-hero__cta abx-premium-hero__cta--secondary abx-native-sandbox-chapter__explore" href="/try">
            Explore verification demo
          </Link>
          <div className="abx-native-sandbox-chapter__flow">
            <WelcomeStartSandboxFlow />
          </div>
        </div>
      </div>
    </section>
  );
}
