// FILE: examples/good-trouble-wix/pages/GoodTroubleMasterPage.js
// Wix Velo Master Page / site-wide code — paste into Site → Custom Code → Master Page (or equivalent).
//
// Closes Wix Studio automatic age lightboxes when Abraxas purchase/browse verification
// already completed. Does NOT authorize checkout — server web methods remain authoritative.

import { shouldSuppressAutomaticAgeLightbox } from "public/siteAgeGatePolicy";

import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import { local, session } from "wix-storage-frontend";

$w.onReady(() => {
  if (wixWindow.rendering.env !== "browser") {
    return;
  }

  try {
    const path = String(wixLocationFrontend.url || "/");
    const decision = shouldSuppressAutomaticAgeLightbox({
      localStorage: local,
      sessionStorage: session,
      pagePath: path,
    });

    if (decision.suppress && wixWindow.lightbox) {
      wixWindow.lightbox.close();
    }
  } catch {
    // Non-authoritative UI coordination only.
  }
});
