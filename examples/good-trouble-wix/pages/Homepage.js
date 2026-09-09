// FILE: examples/good-trouble-wix/pages/Homepage.js
// Wix Velo homepage — hygiene + browse age-gate suppression for the browser session.

import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import { session } from "wix-storage-frontend";

import { stripSensitiveCallbackParamsFromHref } from "public/browseCallbackHygiene";
import {
  dismissBrowseAgeVerificationPopup,
  shouldSuppressBrowseAgeGate,
} from "public/browseAccessUi";

$w.onReady(() => {
  if (wixWindow.rendering.env !== "browser") {
    return;
  }

  stripSensitiveParamsImmediately();

  if (shouldSuppressBrowseAgeGate(session)) {
    void dismissBrowseAgeVerificationPopup(wixWindow);
  }
});

function stripSensitiveParamsImmediately() {
  try {
    if (typeof window === "undefined" || !window.history?.replaceState) {
      return;
    }

    stripSensitiveCallbackParamsFromHref(
      wixLocationFrontend.url,
      (state, title, url) => window.history.replaceState(state, title, url),
    );
  } catch {
    // URL hygiene only — never treated as verification.
  }
}
