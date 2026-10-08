"use client";
// FILE: components/sui/NativeHolderHandoffListener.tsx
// Bridge Android/iOS custom-scheme returns into the hosted Passport WebView.

import { useEffect } from "react";
import { getNativeHolderOrigin, isNativeHolderApp } from "@/lib/sui/zklogin/holderPlatform";
import {
  buildPassportHandoffUrl,
  handoffCodeFromSearch,
  parseHandoffCodeFromUrl,
} from "@/lib/sui/zklogin/nativeHandoffClient";

function navigateToHandoffCode(code: string): void {
  const target = buildPassportHandoffUrl(code);
  const currentCode = handoffCodeFromSearch(window.location.search);
  const passportPath = `${getNativeHolderOrigin()}/passport`;
  if (currentCode === code && window.location.href.startsWith(passportPath)) {
    return;
  }
  window.location.assign(target);
}

export function NativeHolderHandoffListener() {
  useEffect(() => {
    if (!isNativeHolderApp()) return;

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const { App } = await import("@capacitor/app");

      const launch = await App.getLaunchUrl().catch(() => undefined);
      if (!cancelled && launch?.url) {
        const code = parseHandoffCodeFromUrl(launch.url);
        if (code) navigateToHandoffCode(code);
      }

      const openSub = await App.addListener("appUrlOpen", ({ url }) => {
        const code = parseHandoffCodeFromUrl(url);
        if (code) navigateToHandoffCode(code);
      });
      cleanups.push(() => openSub.remove());

      const stateSub = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        const code = handoffCodeFromSearch(window.location.search);
        if (code) return;
        void App.getLaunchUrl().then((row) => {
          const fromLaunch = row?.url ? parseHandoffCodeFromUrl(row.url) : null;
          if (fromLaunch) navigateToHandoffCode(fromLaunch);
        }).catch(() => undefined);
      });
      cleanups.push(() => stateSub.remove());
    })();

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}
