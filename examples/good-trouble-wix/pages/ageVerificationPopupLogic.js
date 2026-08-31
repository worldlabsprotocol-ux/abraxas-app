// FILE: examples/good-trouble-wix/pages/ageVerificationPopupLogic.js
// Wix deployment: copy to src/public/ageVerificationPopupLogic.js
// Testable Abraxas-only CAPTCHA gating + traditional self-attestation for Age Verification popup.
// Human check applies to Abraxas Passport only — never age, identity, or eligibility verification.

/** Traditional self-attestation localStorage key (30-day TTL). Not Abraxas authority. */
export const TRADITIONAL_AGE_GATE_STORAGE_KEY = "good_trouble_age_self_attested";
export const TRADITIONAL_AGE_GATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const CAPTCHA_STATE = {
  PENDING: "pending",
  VERIFIED: "verified",
  INVALID: "invalid",
};

export const ABRAXAS_LABEL = "Verify with Abraxas Passport";
export const ABRAXAS_CAPTCHA_PENDING =
  "Complete the human check below to start Abraxas Passport verification.";
export const ABRAXAS_SUPPORT =
  "Stronger, reusable policy-backed verification. Your ID photos and date of birth are not shared with Good Trouble.";
export const TRADITIONAL_SUPPORT =
  "Quick age self-attestation for this visit.";

export const POPUP_STATUS = {
  ABRAXAS_CAPTCHA_PENDING: ABRAXAS_CAPTCHA_PENDING,
  ABRAXAS_CAPTCHA_UNAVAILABLE: "Human check unavailable. Please try again shortly.",
  ABRAXAS_STARTING: "Starting verification…",
  ABRAXAS_FAILURE:
    "Verification could not be started. Please try again or use the traditional option.",
  ABRAXAS_CAPTCHA_REQUIRED:
    "Complete the human check below before starting Abraxas Passport verification.",
  SESSION_UNAVAILABLE:
    "Verification is unavailable in this browser mode. Use “Yes, I’m 21 or older” or try another browser.",
};

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
 * @param {{
 *   setAbraxasButtonEnabled: (enabled: boolean) => void,
 *   setStatus: (message: string) => void,
 *   getCaptchaToken: () => Promise<string>,
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
 *   persistTraditionalAgeAttestation?: (storage: Storage) => void,
 *   onTraditionalYesComplete?: () => void | Promise<void>,
 *   storage?: Storage,
 * }} deps
 */
export function createPopupController(deps) {
  let captchaState = CAPTCHA_STATE.PENDING;
  let abraxasStarting = false;

  const storage = deps.storage ?? null;

  function abraxasButtonEnabled() {
    return captchaState === CAPTCHA_STATE.VERIFIED && !abraxasStarting;
  }

  function syncAbraxasButton() {
    deps.setAbraxasButtonEnabled(abraxasButtonEnabled());
  }

  function invalidateCaptcha() {
    captchaState = CAPTCHA_STATE.INVALID;
    abraxasStarting = false;
    syncAbraxasButton();
    deps.setStatus(POPUP_STATUS.ABRAXAS_CAPTCHA_UNAVAILABLE);
  }

  return {
    getCaptchaState: () => captchaState,
    isAbraxasStarting: () => abraxasStarting,
    isAbraxasButtonEnabled: () => abraxasButtonEnabled(),

    onReady() {
      captchaState = CAPTCHA_STATE.PENDING;
      abraxasStarting = false;
      syncAbraxasButton();
      deps.setStatus(POPUP_STATUS.ABRAXAS_CAPTCHA_PENDING);
    },

    onCaptchaVerified() {
      captchaState = CAPTCHA_STATE.VERIFIED;
      abraxasStarting = false;
      syncAbraxasButton();
      deps.setStatus(ABRAXAS_SUPPORT);
    },

    onCaptchaInvalidated() {
      invalidateCaptcha();
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
      if (captchaState !== CAPTCHA_STATE.VERIFIED) {
        deps.setStatus(POPUP_STATUS.ABRAXAS_CAPTCHA_REQUIRED);
        return { ok: false, code: "captcha_required" };
      }
      if (abraxasStarting) {
        return { ok: false, code: "already_starting" };
      }

      abraxasStarting = true;
      syncAbraxasButton();
      deps.setStatus(POPUP_STATUS.ABRAXAS_STARTING);

      if (!deps.sessionStorageAvailable()) {
        deps.setStatus(POPUP_STATUS.SESSION_UNAVAILABLE);
        abraxasStarting = false;
        syncAbraxasButton();
        return { ok: false, code: "session_storage_unavailable" };
      }

      try {
        const captchaToken = await deps.getCaptchaToken();
        if (!captchaToken) {
          deps.resetCaptcha?.();
          invalidateCaptcha();
          deps.setStatus(POPUP_STATUS.ABRAXAS_FAILURE);
          return { ok: false, code: "captcha_token_missing" };
        }

        const result = await deps.startAbraxasVerification(captchaToken);
        if (result?.error) {
          deps.resetCaptcha?.();
          invalidateCaptcha();
          deps.setStatus(POPUP_STATUS.ABRAXAS_FAILURE);
          return { ok: false, code: "start_failed" };
        }

        const { verifyUrl, flowId, verifier } = result;
        if (!verifyUrl || !flowId || !verifier) {
          deps.resetCaptcha?.();
          invalidateCaptcha();
          deps.setStatus(POPUP_STATUS.ABRAXAS_FAILURE);
          return { ok: false, code: "start_incomplete" };
        }

        deps.storeVerifier(flowId, verifier);
        deps.navigateToVerifyUrl(verifyUrl);
        return { ok: true, code: "navigating" };
      } catch {
        deps.resetCaptcha?.();
        invalidateCaptcha();
        deps.setStatus(POPUP_STATUS.ABRAXAS_FAILURE);
        return { ok: false, code: "start_exception" };
      } finally {
        if (abraxasStarting) {
          abraxasStarting = false;
          if (captchaState === CAPTCHA_STATE.VERIFIED) {
            syncAbraxasButton();
          }
        }
      }
    },
  };
}
