// FILE: examples/good-trouble-wix/pages/ageVerificationPopupLogic.js
// Wix deployment: copy to src/public/ageVerificationPopupLogic.js
// Abraxas-only CAPTCHA gating + traditional self-attestation for Age Verification popup.
// Human check applies to Abraxas Passport only — never age, identity, or eligibility verification.

/** Traditional self-attestation localStorage key (30-day TTL). Not Abraxas authority. */
export const TRADITIONAL_AGE_GATE_STORAGE_KEY = "good_trouble_age_self_attested";
export const TRADITIONAL_AGE_GATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const POPUP_STATE = {
  WAITING_FOR_CAPTCHA: "waiting_for_captcha",
  CAPTCHA_VERIFIED: "captcha_verified",
  STARTING_BACKEND: "starting_backend",
  PREVIEW_BACKEND_PASSED: "preview_backend_passed",
  REDIRECTING: "redirecting",
  RECOVERABLE_ERROR: "recoverable_error",
};

export const ABRAXAS_LABEL_INITIAL = "Verify with Abraxas Passport";
export const ABRAXAS_LABEL = ABRAXAS_LABEL_INITIAL;
export const ABRAXAS_LABEL_CONTINUE = "Continue with Abraxas";
export const ABRAXAS_LABEL_STARTING = "Starting…";
export const ABRAXAS_LABEL_RETRY = "Try Abraxas Again";

export const STATUS_WAITING_CAPTCHA = "Complete the human check to use Abraxas Passport.";
export const STATUS_CAPTCHA_VERIFIED = "Human check complete. Continue with Abraxas Passport.";
export const STATUS_CONTACTING_BACKEND = "Contacting the Good Trouble verification backend…";
export const STATUS_PREVIEW_PASSED =
  "Preview check passed: CAPTCHA and Wix backend flow are working.";
export const STATUS_CAPTCHA_UNAVAILABLE = "Human check unavailable. Please try again shortly.";
export const STATUS_CAPTCHA_REQUIRED_CLICK =
  "Complete the human check before starting Abraxas Passport verification.";
export const STATUS_SESSION_UNAVAILABLE =
  "Verification is unavailable in this browser mode. Use “Yes, I’m 21 or older” or try another browser.";
export const STATUS_GENERIC_FAILURE =
  "Verification could not be started. Please try again or use the traditional option.";

export const TRADITIONAL_SUPPORT = "Quick age self-attestation for this visit.";
export const ABRAXAS_SUPPORT =
  "Stronger, reusable policy-backed verification. Your ID photos and date of birth are not shared with Good Trouble.";

/** Stable allowlisted backend start error codes surfaced to the popup. */
export const ALLOWLISTED_START_ERROR_CODES = new Set([
  "captcha_required",
  "captcha_invalid",
  "captcha_not_configured",
  "rate_limited",
]);

export const START_ERROR_MESSAGES = {
  captcha_required: "Complete the human check and try again.",
  captcha_invalid: "Human check failed. Please try again.",
  captcha_not_configured:
    "Verification setup is incomplete. Use the traditional option or try again later.",
  rate_limited: "Verification is busy. Please wait a moment or use the traditional option.",
  captcha_token_missing: "Human check expired. Please complete it again.",
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
 *   resetCaptcha?: () => void,
 *   startAbraxasVerification: (token: string) => Promise<{
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
  let state = POPUP_STATE.WAITING_FOR_CAPTCHA;
  let storedCaptchaToken = "";
  let abraxasInFlight = false;
  let awaitingRetryCaptcha = false;
  let buttonTransitionQueue = Promise.resolve();

  const storage = deps.storage ?? null;

  async function transitionAbraxasButton(enabled) {
    const transition = buttonTransitionQueue.then(() => deps.setAbraxasButtonEnabled(enabled));
    buttonTransitionQueue = transition.catch(() => {});
    await transition;
  }

  async function enterWaitingForCaptcha() {
    state = POPUP_STATE.WAITING_FOR_CAPTCHA;
    storedCaptchaToken = "";
    abraxasInFlight = false;
    await transitionAbraxasButton(false);
    deps.setAbraxasButtonLabel(
      awaitingRetryCaptcha ? ABRAXAS_LABEL_RETRY : ABRAXAS_LABEL_INITIAL,
    );
    deps.setStatus(STATUS_WAITING_CAPTCHA);
  }

  async function enterRecoverableError(code) {
    state = POPUP_STATE.RECOVERABLE_ERROR;
    storedCaptchaToken = "";
    abraxasInFlight = false;
    awaitingRetryCaptcha = true;
    deps.resetCaptcha?.();
    await transitionAbraxasButton(false);
    deps.setAbraxasButtonLabel(ABRAXAS_LABEL_RETRY);
    deps.setStatus(safeStartErrorMessage(code));
    state = POPUP_STATE.WAITING_FOR_CAPTCHA;
  }

  return {
    getState: () => state,
    isAbraxasInFlight: () => abraxasInFlight,
    getStoredCaptchaToken: () => storedCaptchaToken,

    async onReady() {
      awaitingRetryCaptcha = false;
      await enterWaitingForCaptcha();
    },

    /**
     * @param {unknown} captchaToken from #abraxasCaptcha.token after onVerified
     */
    async onCaptchaVerified(captchaToken) {
      const token = typeof captchaToken === "string" ? captchaToken.trim() : "";
      if (!token) {
        return this.onCaptchaInvalidated();
      }

      storedCaptchaToken = token;
      state = POPUP_STATE.CAPTCHA_VERIFIED;
      abraxasInFlight = false;
      awaitingRetryCaptcha = false;
      deps.setAbraxasButtonLabel(ABRAXAS_LABEL_CONTINUE);
      await transitionAbraxasButton(true);
      deps.setStatus(STATUS_CAPTCHA_VERIFIED);
      return { ok: true };
    },

    async onCaptchaInvalidated() {
      storedCaptchaToken = "";
      abraxasInFlight = false;
      await transitionAbraxasButton(false);
      deps.setAbraxasButtonLabel(
        awaitingRetryCaptcha ? ABRAXAS_LABEL_RETRY : ABRAXAS_LABEL_INITIAL,
      );
      deps.setStatus(STATUS_CAPTCHA_UNAVAILABLE);
      state = POPUP_STATE.WAITING_FOR_CAPTCHA;
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
      if (state !== POPUP_STATE.CAPTCHA_VERIFIED || !storedCaptchaToken) {
        deps.setStatus(STATUS_CAPTCHA_REQUIRED_CLICK);
        return { ok: false, code: "captcha_required" };
      }

      abraxasInFlight = true;
      state = POPUP_STATE.STARTING_BACKEND;
      await transitionAbraxasButton(false);
      deps.setAbraxasButtonLabel(ABRAXAS_LABEL_STARTING);
      deps.setStatus(STATUS_CONTACTING_BACKEND);

      if (!deps.sessionStorageAvailable()) {
        await enterRecoverableError("session_storage_unavailable");
        return { ok: false, code: "session_storage_unavailable" };
      }

      try {
        const result = await deps.startAbraxasVerification(storedCaptchaToken);

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
          deps.setAbraxasButtonLabel(ABRAXAS_LABEL_CONTINUE);
          deps.setStatus(STATUS_PREVIEW_PASSED);
          return { ok: true, code: "preview_backend_passed" };
        }

        deps.storeVerifier(flowId, verifier);
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
