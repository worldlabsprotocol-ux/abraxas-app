"use client";
// FILE: components/sui/NativeHolderHandoffListener.tsx
// Bridge Android/iOS custom-scheme returns into the hosted Passport WebView.

import { useEffect } from "react";
import { getNativeHolderOrigin, isNativeHolderApp } from "@/lib/sui/zklogin/holderPlatform";
import {
  buildPassportHandoffUrl,
  createNativeHandoffIngressHandler,
  handoffCodeFromSearch,
} from "@/lib/sui/zklogin/nativeHandoffClient";

function navigateToHandoffCode(code: string): void {
  const target = buildPassportHandoffUrl(code);
  if (!target) return;

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
    const ingress = createNativeHandoffIngressHandler(navigateToHandoffCode);

    void (async () => {
      const { App } = await import("@capacitor/app");

      const openSub = await App.addListener("appUrlOpen", ({ url }) => {
        ingress.handleUrl(url);
      });
      cleanups.push(() => openSub.remove());

      const launch = await App.getLaunchUrl().catch(() => undefined);
      if (!cancelled && launch?.url) {
        ingress.handleUrl(launch.url);
      }

      const stateSub = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        if (handoffCodeFromSearch(window.location.search)) return;
        void App.getLaunchUrl().then((row) => {
          if (row?.url) ingress.handleUrl(row.url);
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
