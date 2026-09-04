// FILE: examples/good-trouble-wix/pages/ageVerificationPopupLogic.js
// Wix deployment: copy to src/public/ageVerificationPopupLogic.js
// Abraxas Passport verification gate + traditional self-attestation for Age Verification popup.
// Abraxas is the visible verification gate — not a CAPTCHA substitute.

/** Traditional self-attestation localStorage key (30-day TTL). Not Abraxas authority. */
export const TRADITIONAL_AGE_GATE_STORAGE_KEY = "good_trouble_age_self_attested";
export const TRADITIONAL_AGE_GATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const POPUP_STATE = {
  READY: "ready",
  STARTING_BACKEND: "starting_backend",
  PREVIEW_BACKEND_PASSED: "preview_backend_passed",
  REDIRECTING: "redirecting",
  RECOVERABLE_ERROR: "recoverable_error",
};

export const ABRAXAS_LABEL = "Verify with Abraxas Passport";
export const ABRAXAS_LABEL_STARTING = "Starting…";

export const STATUS_READY =
  "Use Abraxas Passport for reusable, privacy-preserving verification.";
export const STATUS_STARTING = "Starting secure verification with Abraxas Passport…";
export const STATUS_PREVIEW_PASSED =
  "Preview check passed: Abraxas Passport backend flow is working.";
export const STATUS_SESSION_UNAVAILABLE =
  "Verification is unavailable in this browser mode. Use “Yes, I’m 21 or older” or try another browser.";
export const STATUS_GENERIC_FAILURE =
  "Verification could not be started. Please try again or use the traditional option.";

export const TRADITIONAL_SUPPORT = "Quick age self-attestation for this visit.";
export const ABRAXAS_SUPPORT =
  "Abraxas verifies the required policy without sharing your ID photos or date of birth with Good Trouble.";

/** Stable allowlisted backend start error codes surfaced to the popup. */
export const ALLOWLISTED_START_ERROR_CODES = new Set([
  "rate_limited",
]);

export const START_ERROR_MESSAGES = {
  rate_limited: "Verification is busy. Please wait a moment or use the traditional option.",
  session_storage_unavailable: STATUS_SESSION_UNAVAILABLE,
  start_incomplete: STATUS_GENERIC_FAILURE,
  start_exception: STATUS_GENERIC_FAILURE,
  start_failed: STATUS_GENERIC_FAILURE,
};

/**
 * @param {string} viewMode
 * @returns {boolean}
 */
export function isEditorPreviewViewMode(viewMode) {
  return viewMode === "Preview" || viewMode === "Editor";
}

/**
 * Prevent duplicate popup handlers when $w.onReady runs more than once.
 */
export function createPopupInitializationGuard() {
  let initialized = false;

  return {
    isInitialized: () => initialized,
    /**
     * @template T
     * @param {() => T} fn
     * @returns {{ ok: true, value: T } | { ok: false, code: "already_initialized" }}
     */
    initializeOnce(fn) {
      if (initialized) {
        return { ok: false, code: "already_initialized" };
      }
      initialized = true;
      return { ok: true, value: fn() };
    },
  };
}

/**
 * @param {number} [now]
 * @returns {string}
 */
export function buildTraditionalAgeAttestationValue(now = Date.now()) {
  return String(now + TRADITIONAL_AGE_GATE_TTL_MS);
}

/**
 * @param {Storage} storage
 * @param {number} [now]
 */
export function persistTraditionalAgeAttestation(storage, now = Date.now()) {
  storage.setItem(
    TRADITIONAL_AGE_GATE_STORAGE_KEY,
    buildTraditionalAgeAttestationValue(now),
  );
}

/**
 * @param {string} code
 * @returns {string}
 */
export function safeStartErrorMessage(code) {
  return START_ERROR_MESSAGES[code] ?? STATUS_GENERIC_FAILURE;
}

/**
 * @param {{
 *   setAbraxasButtonEnabled: (enabled: boolean) => void | Promise<void>,
 *   setAbraxasButtonLabel: (label: string) => void,
 *   setStatus: (message: string) => void,
 *   startAbraxasVerification: () => Promise<{
 *     error?: string,
 *     verifyUrl?: string,
 *     flowId?: string,
 *     verifier?: string,
 *   }>,
 *   sessionStorageAvailable: () => boolean,
 *   storeVerifier: (flowId: string, verifier: string) => void,
 *   navigateToVerifyUrl: (url: string) => void,
 *   getViewMode?: () => string | Promise<string>,
 *   persistTraditionalAgeAttestation?: (storage: Storage) => void,
 *   onTraditionalYesComplete?: () => void | Promise<void>,
 *   storage?: Storage,
 * }} deps
 */
export function createPopupController(deps) {
  let state = POPUP_STATE.READY;
  let abraxasInFlight = false;
  let buttonTransitionQueue = Promise.resolve();

  const storage = deps.storage ?? null;

  async function transitionAbraxasButton(enabled) {
    const transition = buttonTransitionQueue.then(() => deps.setAbraxasButtonEnabled(enabled));
    buttonTransitionQueue = transition.catch(() => {});
    await transition;
  }

  async function enterReady() {
    state = POPUP_STATE.READY;
    abraxasInFlight = false;
    deps.setAbraxasButtonLabel(ABRAXAS_LABEL);
    await transitionAbraxasButton(true);
    deps.setStatus(STATUS_READY);
  }

  async function enterRecoverableError(code) {
    state = POPUP_STATE.RECOVERABLE_ERROR;
    abraxasInFlight = false;
    const message = ALLOWLISTED_START_ERROR_CODES.has(code)
      ? safeStartErrorMessage(code)
      : STATUS_GENERIC_FAILURE;
    deps.setAbraxasButtonLabel(ABRAXAS_LABEL);
    await transitionAbraxasButton(true);
    deps.setStatus(message);
    state = POPUP_STATE.READY;
  }

  return {
    getState: () => state,
    isAbraxasInFlight: () => abraxasInFlight,

    async onReady() {
      await enterReady();
    },

    async onTraditionalYesClick() {
      if (storage && deps.persistTraditionalAgeAttestation) {
        deps.persistTraditionalAgeAttestation(storage);
      } else if (storage) {
        persistTraditionalAgeAttestation(storage);
      }
      if (deps.onTraditionalYesComplete) {
        await deps.onTraditionalYesComplete();
      }
      return { ok: true, code: "traditional_self_attested" };
    },

    async onAbraxasClick() {
      if (abraxasInFlight) {
        return { ok: false, code: "already_starting" };
      }

      abraxasInFlight = true;
      state = POPUP_STATE.STARTING_BACKEND;
      await transitionAbraxasButton(false);
      deps.setAbraxasButtonLabel(ABRAXAS_LABEL_STARTING);
      deps.setStatus(STATUS_STARTING);

      if (!deps.sessionStorageAvailable()) {
        await enterRecoverableError("session_storage_unavailable");
        return { ok: false, code: "session_storage_unavailable" };
      }

      try {
        const result = await deps.startAbraxasVerification();

        if (result?.error) {
          const code = ALLOWLISTED_START_ERROR_CODES.has(result.error)
            ? result.error
            : "start_failed";
          await enterRecoverableError(code);
          return { ok: false, code };
        }

        const { verifyUrl, flowId, verifier } = result;
        if (!verifyUrl || !flowId || !verifier) {
          await enterRecoverableError("start_incomplete");
          return { ok: false, code: "start_incomplete" };
        }

        const viewMode = deps.getViewMode ? await deps.getViewMode() : "Site";
        if (isEditorPreviewViewMode(viewMode)) {
          state = POPUP_STATE.PREVIEW_BACKEND_PASSED;
          abraxasInFlight = false;
          await transitionAbraxasButton(false);
          deps.setAbraxasButtonLabel(ABRAXAS_LABEL);
          deps.setStatus(STATUS_PREVIEW_PASSED);
          return { ok: true, code: "preview_backend_passed" };
        }

        deps.storeVerifier(flowId, verifier);
        if (deps.saveReturnDestination) {
          deps.saveReturnDestination();
        }
        state = POPUP_STATE.REDIRECTING;
        deps.navigateToVerifyUrl(verifyUrl);
        return { ok: true, code: "redirecting" };
      } catch {
        await enterRecoverableError("start_exception");
        return { ok: false, code: "start_exception" };
      }
    },
  };
}
