"use client";
// FILE: components/home/HomeNativeSandboxChapter.tsx

import { HomeSandboxSessionEntry } from "@/components/home/HomeSandboxSessionEntry";

export function HomeNativeSandboxChapter() {
  return (
    <section id="start-sandbox" className="abx-native-sandbox-chapter abx-native-sandbox-chapter--focused" aria-label="Sandbox builder">
      <div className="abx-native-sandbox-chapter__panel abx-native-sandbox-chapter__panel--solo">
        <HomeSandboxSessionEntry />
      </div>
    </section>
  );
}
