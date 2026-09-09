// FILE: examples/good-trouble-wix/public/browseAccessUi.js
// L0 browse session UI helpers — dismiss age popup only; never checkout authority.

import { BROWSE_ACCESS_STORAGE_KEY } from "./abraxasClientConstants.js";

/** SessionStorage value written only after backend-verified browse success. */
export const BROWSE_ACCESS_SESSION_VALUE = "1";

/**
 * @param {{ getItem: (key: string) => string | null }} sessionStorage
 * @returns {boolean}
 */
export function isBrowseAccessGranted(sessionStorage) {
  try {
    return sessionStorage.getItem(BROWSE_ACCESS_STORAGE_KEY) === BROWSE_ACCESS_SESSION_VALUE;
  } catch {
    return false;
  }
}

/**
 * @param {{ getItem: (key: string) => string | null }} sessionStorage
 * @returns {boolean}
 */
export function shouldSuppressBrowseAgeGate(sessionStorage) {
  return isBrowseAccessGranted(sessionStorage);
}

/**
 * @param {{ setItem: (key: string, value: string) => void }} sessionStorage
 */
export function setBrowseAccessSessionFlag(sessionStorage) {
  sessionStorage.setItem(BROWSE_ACCESS_STORAGE_KEY, BROWSE_ACCESS_SESSION_VALUE);
}

/**
 * Best-effort close of the Age Verification lightbox when browse access is granted.
 * @param {{ lightbox?: { close: () => Promise<void> | void } }} wixWindow
 */
export async function dismissBrowseAgeVerificationPopup(wixWindow) {
  try {
    if (wixWindow?.lightbox?.close) {
      await wixWindow.lightbox.close();
    }
  } catch {
    // Non-authoritative UI cleanup.
  }
}
