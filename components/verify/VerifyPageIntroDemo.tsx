"use client";

import { ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { IndependentVerifyCinematicDemo } from "@/components/home/cinematic/IndependentVerifyCinematicDemo";

export function VerifyPageIntroDemo() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem) 0.5rem" }}>
      <ConceptDemoVideo demo={IndependentVerifyCinematicDemo} id="verify-intro-demo" />
    </div>
  );
}
