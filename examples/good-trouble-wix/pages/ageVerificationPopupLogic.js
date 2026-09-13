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

export const ABRAXAS_BROWSE_LABEL = "Verify age with Abraxas Passport";
export const ABRAXAS_PURCHASE_LABEL = "Verify eligibility for purchase";

export const ABRAXAS_LABEL = ABRAXAS_BROWSE_LABEL;
export const ABRAXAS_LABEL_STARTING = "Starting…";

export const BROWSE_POLICY_ID = "good-trouble-browse-v1";
export const BROWSE_FLOW_ID_PREFIX = "gtb_";
export const PURCHASE_POLICY_ID = "good-trouble-retail-v1";
export const PURCHASE_FLOW_ID_PREFIX = "gtf_";
export const BROWSE_CALLBACK_PATH = "browse-verification-result";
export const PURCHASE_CALLBACK_PATH = "age-verification-result";

/** Session keys that must not leak purchase state into a fresh browse start. */
export const PURCHASE_SESSION_KEYS_TO_CLEAR = [
  "good_trouble_return_destination_purchase",
  "good_trouble_purchase_verified_pilot",
  "good_trouble_return_destination",
];

export const STATUS_READY =
  "Enter your birthday once on Abraxas. Good Trouble receives only a yes-or-no result.";
export const STATUS_STARTING = "Starting age verification with Abraxas…";
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
 * Remove purchase-only session artifacts so a browse click never reuses gtf_ state.
 * @param {(key: string) => void} removeItem
 */
export function clearStalePurchaseSessionArtifacts(removeItem) {
  for (const key of PURCHASE_SESSION_KEYS_TO_CLEAR) {
    try {
      removeItem(key);
    } catch {
      // Non-authoritative cleanup.
    }
  }
}

/**
 * Fail closed if the backend returned purchase or mixed lifecycle metadata.
 * @param {object | null | undefined} result
 * @returns {{ ok: true, result: object } | { ok: false, code: string }}
 */
export function validateBrowseVerificationStart(result) {
  if (!result || result.error) {
    return { ok: false, code: result?.error ?? "start_failed" };
  }

  const verifyUrl = typeof result.verifyUrl === "string" ? result.verifyUrl : "";
  const flowId = typeof result.flowId === "string" ? result.flowId : "";
  const verifier = typeof result.verifier === "string" ? result.verifier : "";
  const policyId = typeof result.policyId === "string" ? result.policyId : "";
  const purpose = typeof result.purpose === "string" ? result.purpose : "";

  if (!verifyUrl || !flowId || !verifier) {
    return { ok: false, code: "start_incomplete" };
  }

  if (!flowId.startsWith(BROWSE_FLOW_ID_PREFIX)) {
    return { ok: false, code: "browse_start_not_browse_flow" };
  }

  if (flowId.startsWith(PURCHASE_FLOW_ID_PREFIX)) {
    return { ok: false, code: "browse_start_purchase_flow_leak" };
  }

  if (policyId && policyId !== BROWSE_POLICY_ID) {
    return { ok: false, code: "browse_start_wrong_policy" };
  }

  if (purpose && purpose !== "browse") {
    return { ok: false, code: "browse_start_wrong_purpose" };
  }

  const normalizedUrl = verifyUrl.toLowerCase();
  if (normalizedUrl.includes(PURCHASE_POLICY_ID)) {
    return { ok: false, code: "browse_start_retail_policy" };
  }

  if (normalizedUrl.includes(PURCHASE_CALLBACK_PATH)) {
    return { ok: false, code: "browse_start_purchase_callback" };
  }

  if (!normalizedUrl.includes(BROWSE_POLICY_ID)) {
    return { ok: false, code: "browse_start_missing_browse_policy" };
  }

  if (!normalizedUrl.includes("purpose=browse")) {
    return { ok: false, code: "browse_start_missing_purpose" };
  }

  if (!normalizedUrl.includes(BROWSE_CALLBACK_PATH)) {
    return { ok: false, code: "browse_start_missing_browse_callback" };
  }

  return { ok: true, result };
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
 *   clearStalePurchaseArtifacts?: () => void,
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

      if (deps.clearStalePurchaseArtifacts) {
        deps.clearStalePurchaseArtifacts();
      }

      try {
        const result = await deps.startAbraxasVerification();

        const validated = validateBrowseVerificationStart(result);
        if (!validated.ok) {
          const code = ALLOWLISTED_START_ERROR_CODES.has(validated.code)
            ? validated.code
            : "start_failed";
          await enterRecoverableError(code);
          return { ok: false, code };
        }

        const { verifyUrl, flowId, verifier } = validated.result;

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
