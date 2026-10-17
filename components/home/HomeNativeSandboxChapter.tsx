"use client";
// FILE: components/home/HomeNativeSandboxChapter.tsx

import { HomeSandboxSessionEntry } from "@/components/home/HomeSandboxSessionEntry";
import {
  HOMEPAGE_WORKSPACE_HEADING,
  HOMEPAGE_WORKSPACE_LEAD,
} from "@/lib/home/homepagePlainCopy";

export function HomeNativeSandboxChapter() {
  return (
    <section
      id="start-sandbox"
      className="abx-native-sandbox-chapter abx-native-sandbox-chapter--focused"
      aria-labelledby="home-sandbox-heading"
    >
      <div className="abx-native-sandbox-chapter__intro">
        <h2 id="home-sandbox-heading" className="abx-v2-section-title">
          {HOMEPAGE_WORKSPACE_HEADING}
        </h2>
        <p className="abx-v2-section-lead abx-v2-section-lead--tight">{HOMEPAGE_WORKSPACE_LEAD}</p>
      </div>

      <div className="abx-native-sandbox-chapter__panel abx-native-sandbox-chapter__panel--solo">
        <HomeSandboxSessionEntry />
      </div>
    </section>
  );
}
