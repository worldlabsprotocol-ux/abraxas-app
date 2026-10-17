"use client";
// FILE: components/home/HomeNativeSandboxChapter.tsx
// Focused sandbox entry — no duplicate emblem or trust pipeline (established in hero flow below).

import { HomeSandboxSessionEntry } from "@/components/home/HomeSandboxSessionEntry";

export function HomeNativeSandboxChapter() {
  return (
    <section
      id="start-sandbox"
      className="abx-native-sandbox-chapter abx-native-sandbox-chapter--focused"
      aria-labelledby="home-sandbox-heading"
    >
      <div className="abx-native-sandbox-chapter__intro">
        <h2 id="home-sandbox-heading" className="abx-v2-section-title">
          Start your sandbox
        </h2>
        <p className="abx-v2-section-lead abx-v2-section-lead--tight">
          Build and test verification without collecting identity data.
        </p>
      </div>

      <div className="abx-native-sandbox-chapter__panel abx-native-sandbox-chapter__panel--solo">
        <HomeSandboxSessionEntry />
      </div>
    </section>
  );
}
