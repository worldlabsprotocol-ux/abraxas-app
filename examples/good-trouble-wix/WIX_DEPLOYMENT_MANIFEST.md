# WIX_DEPLOYMENT_MANIFEST.md

Good Trouble × Abraxas — two-tier age lifecycle (browse L0 + purchase L2+).

**Source of truth:** `main` branch after merge of PR #260.  
**Audit date:** 2026-09-08.  
**Wix test suite:** 130/130 passing on `main`.

---

## A. Exact file inventory

Deploy in this order (Public → Backend → Pages/lightbox):

| Order | Repository path | Wix destination | Wix filename / target | Replace or new | Direct dependencies |
|------:|-----------------|-------------------|----------------------|----------------|---------------------|
| 1 | `examples/good-trouble-wix/public/abraxasClientConstants.js` | Public file | `src/public/abraxasClientConstants.js` | New (or replace if split) | — |
| 2 | `examples/good-trouble-wix/pages/ageVerificationPopupLogic.js`
| 2b | `examples/good-trouble-wix/pages/purchaseVerificationLogic.js` | Public file | `src/public/purchaseVerificationLogic.js` | **New** | — | | Public file | `src/public/ageVerificationPopupLogic.js` | Replace | — |
| 3 | `examples/good-trouble-wix/backend/constants.js` | Backend file | `src/backend/constants.js` | Replace | `../public/abraxasClientConstants.js` |
| 4 | `examples/good-trouble-wix/backend/browseConstants.js` | Backend file | `src/backend/browseConstants.js` | **New** | — |
| 5 | `examples/good-trouble-wix/backend/flowPurpose.js` | Backend file | `src/backend/flowPurpose.js` | **New** | `./constants.js` |
| 6 | `examples/good-trouble-wix/backend/pkceProof.js` | Backend file | `src/backend/pkceProof.js` | Replace | `./constants.js`, `node:crypto` |
| 7 | `examples/good-trouble-wix/backend/sha256Adapter.js` | Backend file | `src/backend/sha256Adapter.js` | Replace | `node:crypto` |
| 8 | `examples/good-trouble-wix/backend/flowCapacity.js`
| 8b | `examples/good-trouble-wix/backend/flowStartDiagnostics.js` | Backend file | `src/backend/flowStartDiagnostics.js` | **New** | `./flowPurpose.js` |
| 8c | `examples/good-trouble-wix/backend/wixDataCount.js` | Backend file | `src/backend/wixDataCount.js` | **New** | — | | Backend file | `src/backend/flowCapacity.js` | Replace | — |
| 9 | `examples/good-trouble-wix/backend/captchaGate.js` | Backend file | `src/backend/captchaGate.js` | Replace | — |
| 10 | `examples/good-trouble-wix/backend/browseReceiptValidator.js` | Backend file | `src/backend/browseReceiptValidator.js` | **New** | `./browseConstants.js` |
| 11 | `examples/good-trouble-wix/backend/abraxasReceiptValidator.js` | Backend file | `src/backend/abraxasReceiptValidator.js` | Replace | — |
| 12 | `examples/good-trouble-wix/backend/browseReceiptRemoteValidator.js` | Backend file | `src/backend/browseReceiptRemoteValidator.js` | **New** | `./constants.js`, `./browseReceiptValidator.js` |
| 13 | `examples/good-trouble-wix/backend/purchaseEligibilityAuthorization.js` | Backend file | `src/backend/purchaseEligibilityAuthorization.js` | **New** | `./browseReceiptValidator.js`, `./abraxasReceiptValidator.js`, `./constants.js` |
| 14 | `examples/good-trouble-wix/backend/checkoutAuthorization.js` | Backend file | `src/backend/checkoutAuthorization.js` | **New** | `./purchaseEligibilityAuthorization.js`, `./constants.js` |
| 15 | `examples/good-trouble-wix/backend/nonceLifecycle.js` | Backend file | `src/backend/nonceLifecycle.js` | Replace | `./constants.js`, `./flowPurpose.js`, `./pkceProof.js`, `node:crypto` |
| 16 | `examples/good-trouble-wix/backend/wixNonceStore.js` | Backend file | `src/backend/wixNonceStore.js` | Replace | `wix-data`, `./constants.js` |
| 17 | `examples/good-trouble-wix/backend/abraxasVerificationService.js` | Backend file | `src/backend/abraxasVerificationService.js` | Replace | receipt validators, `nonceLifecycle`, `wixNonceStore` (dynamic), `captchaGate`, `constants` |
| 18 | `examples/good-trouble-wix/backend/abraxasVerification.web.js` | Backend file | `src/backend/abraxasVerification.web.js` | Replace | `wix-web-module`, `./abraxasVerificationService.js` |
| 19 | `examples/good-trouble-wix/pages/AgeVerificationPopup.js` | Lightbox code | Age Verification popup panel | Replace | `backend/abraxasVerification.web`, `public/*`, Wix frontend modules |
| 20 | `examples/good-trouble-wix/pages/BrowseVerificationResult.js` | Page code | `/browse-verification-result` page | **New page** | `backend/abraxasVerification.web`, `public/abraxasClientConstants`, `wix-location`, `wix-storage-frontend` |
| 21 | `examples/good-trouble-wix/pages/AgeVerificationResult.js` | Page code | `/age-verification-result` page | Replace | `backend/abraxasVerification.web`, `public/abraxasClientConstants`, `wix-location`, `wix-storage-frontend` |
| 22 | `examples/good-trouble-wix/pages/PurchaseVerificationEntry.js` | Page code | Cart / pre-checkout page (operator slug) | **New page** | `backend/abraxasVerification.web`, `public/purchaseVerificationLogic`, `public/abraxasClientConstants`, `wix-location-frontend`, `wix-window`, `wix-storage-frontend` |

**Browse receipt validation (authoritative Wix backend filenames):**

| Wix backend filename | Repository source | Role |
|----------------------|-------------------|------|
| `src/backend/browseReceiptValidator.js` | `backend/browseReceiptValidator.js` | Local payload/metadata checks (`artifact_type`, `purpose`, `age_band`, partner/policy, expiry, no PII) |
| `src/backend/browseReceiptRemoteValidator.js` | `backend/browseReceiptRemoteValidator.js` | Abraxas `POST /api/age-assurance/browse-receipt/verify` + metadata assembly → `browseReceiptValidator.js` |

> **Never create `browseReceiptMetadataValidator.js` on Wix.** That filename is not in this repository (GitHub returns 404). It is an operator typo for the two modules above. An empty file with the wrong name breaks browse callback completion.

**Do not deploy:** `*.test.js`, `backend/memoryNonceStore.js`, `pages/verificationCallbackLogic.js` (unused duplicate helpers).

### Lifecycle mapping

| Lifecycle | Policy | Purpose | Assurance | Flow prefix | Callback slug | Wix entry |
|-----------|--------|---------|-----------|-------------|---------------|-----------|
| Browse | `good-trouble-browse-v1` | `browse` | L0 | `gtb_` | `/browse-verification-result` | Age Verification popup → `createBrowseVerificationStart` |
| Purchase | `good-trouble-retail-v1` | `purchase` | L2+ | `gtf_` | `/age-verification-result` | Purchase Verification Entry → `createPurchaseVerificationStart` |

---

## B. Wix pages and elements

### 1. Age Verification popup (lightbox)

| Wix page/lightbox name | URL slug | Element ID | Type | Suggested label | Required |
|------------------------|----------|------------|------|-----------------|----------|
| Age Verification | *(lightbox — no slug)* | `yesButton` | Button | "Yes, I am 21+" | **Required** |
| Age Verification | *(lightbox)* | `noButton` | Button | "No" | **Required** |
| Age Verification | *(lightbox)* | `abraxasButton` | Button/Link | "Verify with Abraxas (browse)" | **Required** (link = None) |
| Age Verification | *(lightbox)* | `abraxasStatusText` | Text | Status message | **Required** |

**Must NOT exist:** `abraxasCaptcha` (removed; CAPTCHA bypassed server-side in pilot).

### 2. Browse callback page

| Wix page name | URL slug | Element ID | Type | Suggested label | Required |
|---------------|----------|------------|------|-----------------|----------|
| Browse Verification Result | `browse-verification-result` | `abraxasStatusText` | Text | Callback status | **Required** |

Allowlisted query params: `browse_receipt`, `partner_id`, `policy_id`, `purpose`, `gtb`.

### 3. Purchase callback page

| Wix page name | URL slug | Element ID | Type | Suggested label | Required |
|---------------|----------|------------|------|-----------------|----------|
| Age Verification Result | `age-verification-result` | `abraxasStatusText` | Text | Callback status | **Required** |
| Age Verification Result | `age-verification-result` | `restartAbraxasButton` | Button | "Start again" | Optional (shown on failure) |

Allowlisted query params: `status`, `decision_id`, `receipt_id`, `receipt_expires_at`, `credential_id`, `policy_id`, `partner_id`, `gtv`.

### 4. Purchase verification entry (cart / pre-checkout)

| Wix page name | URL slug | Element ID | Type | Suggested label | Required |
|---------------|----------|------------|------|-----------------|----------|
| Purchase Verification Entry | *(operator choice, e.g. `purchase-verification`)* | `purchaseAbraxasButton` | Button | "Verify purchase eligibility" | **Required** |
| Purchase Verification Entry | *(operator choice)* | `purchaseStatusText` | Text | Start status | Optional (guarded) |

### 5. CMS collection `AbraxasVerificationNonces`

Admin-only read/write. Required fields include: `flowId`, `verifierChallenge`, `state`, `createdAt`, `expiresAt`, `claimExpiresAt`, `claimToken`, `validationAttempts`, `consumedAt`, `correlationId`, `purpose`, `policyId`.

---

## C. Copy-ready source


### public/abraxasClientConstants.js

- **Wix destination:** Public file
- **Wix path/name:** `src/public/abraxasClientConstants.js`

```javascript
// FILE: examples/good-trouble-wix/public/abraxasClientConstants.js
// Browser-safe constants for Wix client page code and public modules.
// Do not add secrets, validation modes, partner security config, or receipt controls here.

/** Purchase flow id query param on the purchase callback URL (never the PKCE verifier). */
export const GTV_PARAM = "gtv";

/** Browse flow id query param on the browse callback URL (never the PKCE verifier). */
export const GTB_PARAM = "gtb";

/** Purchase verifier prefix — `${PURCHASE_VERIFIER_STORAGE_PREFIX}${flowId}`. */
export const PURCHASE_VERIFIER_STORAGE_PREFIX = "abraxas_gt_purchase_verifier_";

/** Browse verifier prefix — `${BROWSE_VERIFIER_STORAGE_PREFIX}${flowId}`. */
export const BROWSE_VERIFIER_STORAGE_PREFIX = "abraxas_gt_browse_verifier_";

/** @deprecated Use PURCHASE_VERIFIER_STORAGE_PREFIX */
export const VERIFIER_STORAGE_PREFIX = PURCHASE_VERIFIER_STORAGE_PREFIX;

/** Purchase return destination saved before Abraxas redirect (same-origin path). */
export const PURCHASE_RETURN_DESTINATION_STORAGE_KEY = "good_trouble_return_destination_purchase";

/** Browse return destination saved before Abraxas browse redirect. */
export const BROWSE_RETURN_DESTINATION_STORAGE_KEY = "good_trouble_return_destination_browse";

/** @deprecated Use PURCHASE_RETURN_DESTINATION_STORAGE_KEY */
export const RETURN_DESTINATION_STORAGE_KEY = PURCHASE_RETURN_DESTINATION_STORAGE_KEY;

/**
 * L0 browse UI flag — sessionStorage only.
 * May dismiss the age popup; NOT accepted for checkout authorization.
 */
export const BROWSE_ACCESS_STORAGE_KEY = "good_trouble_browse_access_l0";

/**
 * Purchase pilot UI convenience flag — sessionStorage only.
 * NOT authoritative; never read by checkout backend web methods.
 */
export const PURCHASE_VERIFIED_SESSION_FLAG = "good_trouble_purchase_verified_pilot";

/** @deprecated Use PURCHASE_VERIFIED_SESSION_FLAG */
export const PILOT_VERIFIED_SESSION_FLAG = PURCHASE_VERIFIED_SESSION_FLAG;

```

### pages/ageVerificationPopupLogic.js

- **Wix destination:** Public file
- **Wix path/name:** `src/public/ageVerificationPopupLogic.js`

```javascript
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

export const ABRAXAS_BROWSE_LABEL = "Continue browsing with Abraxas";
export const ABRAXAS_PURCHASE_LABEL = "Verify eligibility for purchase";

export const ABRAXAS_LABEL = ABRAXAS_BROWSE_LABEL;
export const ABRAXAS_LABEL_STARTING = "Starting…";

export const STATUS_READY =
  "Enter your date of birth on Abraxas to continue browsing. Good Trouble will not receive your birth date.";
export const STATUS_STARTING = "Starting secure browsing verification with Abraxas…";
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

```

### pages/AgeVerificationPopup.js

- **Wix destination:** Lightbox code
- **Wix path/name:** `Age Verification popup (Velo panel)`

```javascript
// FILE: examples/good-trouble-wix/pages/AgeVerificationPopup.js
// Wix Velo page code — Age Verification popup (lightbox or page).
// Wix deployment: paste into the Age Verification popup page code panel.
//
// Required element IDs:
// #yesButton
// #noButton
// #abraxasButton
// #abraxasStatusText

import { createBrowseVerificationStart } from "backend/abraxasVerification.web";

import {
  BROWSE_RETURN_DESTINATION_STORAGE_KEY,
  BROWSE_VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import wixWindowFrontend from "wix-window-frontend";

import {
  local,
  session,
} from "wix-storage-frontend";

import {
  createPopupController,
  createPopupInitializationGuard,
} from "public/ageVerificationPopupLogic";

const popupInitGuard =
  createPopupInitializationGuard();

/**
 * @type {ReturnType<typeof createPopupController> | null}
 */
let popupController = null;

$w.onReady(() => {
  if (wixWindow.rendering.env !== "browser") {
    return;
  }

  const initialized =
    popupInitGuard.initializeOnce(() => {
      popupController =
        createPopupController({
          async setAbraxasButtonEnabled(
            enabled
          ) {
            await setButtonEnabled(
              "#abraxasButton",
              enabled
            );
          },

          setAbraxasButtonLabel(label) {
            setButtonLabel(
              "#abraxasButton",
              label
            );
          },

          setStatus(message) {
            const statusText =
              $w("#abraxasStatusText");

            if (statusText) {
              statusText.text =
                message;
            }
          },

          startAbraxasVerification: () =>
            createBrowseVerificationStart(),

          sessionStorageAvailable,

          storeVerifier(
            flowId,
            verifier
          ) {
            session.setItem(
              verifierStorageKey(flowId),
              verifier
            );
          },

          saveReturnDestination() {
            try {
              const currentUrl =
                String(
                  wixLocationFrontend.url ||
                    ""
                );

              const path =
                currentUrl
                  .split("?")[0]
                  .replace(
                    /^https?:\/\/[^/]+/,
                    ""
                  ) || "/";

              session.setItem(
                BROWSE_RETURN_DESTINATION_STORAGE_KEY,
                path
              );
            } catch {
              // Saving the destination is helpful,
              // but it is not authoritative.
            }
          },

          navigateToVerifyUrl(url) {
            wixLocationFrontend.to(url);
          },

          getViewMode: () =>
            wixWindowFrontend.viewMode,

          storage: local,

          onTraditionalYesComplete() {
            if (wixWindow.lightbox) {
              wixWindow.lightbox.close();
            }
          },
        });

      void popupController.onReady();

      wireButtons();
    });

  if (!initialized.ok) {
    return;
  }
});

async function setButtonEnabled(
  selector,
  enabled
) {
  const element =
    $w(selector);

  if (!element) {
    return;
  }

  if (enabled) {
    await element.enable();
  } else {
    await element.disable();
  }
}

function setButtonLabel(
  selector,
  label
) {
  const element =
    $w(selector);

  if (!element) {
    return;
  }

  element.label =
    label;
}

function wireButtons() {
  $w("#yesButton").onClick(() => {
    void popupController?.onTraditionalYesClick();
  });

  $w("#abraxasButton").onClick(() => {
    void popupController?.onAbraxasClick();
  });

  // #noButton intentionally keeps its
  // Wix-configured default behavior.
}

function sessionStorageAvailable() {
  try {
    const probe =
      "__abraxas_gt_probe__";

    session.setItem(
      probe,
      "1"
    );

    session.removeItem(
      probe
    );

    return true;
  } catch {
    return false;
  }
}

function verifierStorageKey(flowId) {
  return `${BROWSE_VERIFIER_STORAGE_PREFIX}${flowId}`;
}
```

### pages/BrowseVerificationResult.js

- **Wix destination:** Page code
- **Wix path/name:** `Browse Verification Result page`

```javascript
// FILE: examples/good-trouble-wix/pages/BrowseVerificationResult.js
// Wix Velo page code — /browse-verification-result (L0 browse callback).

import { completeBrowseVerification } from "backend/abraxasVerification.web";

import {
  BROWSE_ACCESS_STORAGE_KEY,
  BROWSE_RETURN_DESTINATION_STORAGE_KEY,
  BROWSE_VERIFIER_STORAGE_PREFIX,
  GTB_PARAM,
} from "public/abraxasClientConstants";

import wixLocation from "wix-location";
import { session } from "wix-storage-frontend";

const ALLOWED_CALLBACK_PARAMS = new Set([
  "browse_receipt",
  "partner_id",
  "policy_id",
  "purpose",
  GTB_PARAM,
]);

const GENERIC_FAILURE =
  "Browsing access could not be confirmed. Please try again.";

const RESTART_MESSAGE =
  "This verification was opened in a different browser or tab. Please start again from the age gate.";

const SUCCESS_MESSAGE =
  "Browsing access confirmed. Returning you to Good Trouble…";

let completionStarted = false;

$w.onReady(() => {
  void handleCallback();
});

function setStatus(message) {
  const statusText = $w("#abraxasStatusText");
  if (statusText) statusText.text = message;
}

function sessionStorageAvailable() {
  try {
    const probe = "__abraxas_gt_browse_probe__";
    session.setItem(probe, "1");
    session.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function verifierStorageKey(flowId) {
  return `${BROWSE_VERIFIER_STORAGE_PREFIX}${flowId}`;
}

function parseAllowlistedCallbackParams() {
  const query = wixLocation.query;
  const parsed = {};
  for (const key of Object.keys(query)) {
    if (ALLOWED_CALLBACK_PARAMS.has(key)) parsed[key] = query[key];
  }
  return parsed;
}

function clearVerifier(flowId) {
  try {
    session.removeItem(verifierStorageKey(flowId));
  } catch {
    // non-authoritative cleanup
  }
}

/** L0 browse UI flag — may dismiss age popup; never checkout authority. */
function setBrowseAccessState() {
  try {
    session.setItem(BROWSE_ACCESS_STORAGE_KEY, String(Date.now()));
  } catch {
    // Fail closed for navigation only; user can retry.
  }
}

function restoreReturnDestination() {
  try {
    const destination = session.getItem(BROWSE_RETURN_DESTINATION_STORAGE_KEY);
    session.removeItem(BROWSE_RETURN_DESTINATION_STORAGE_KEY);
    if (destination && typeof destination === "string" && destination.startsWith("/") && !destination.startsWith("//")) {
      setTimeout(() => { wixLocation.to(destination); }, 1200);
      return;
    }
    setTimeout(() => { wixLocation.to("/"); }, 1200);
  } catch {
    // Keep success message visible.
  }
}

async function handleCallback() {
  if (completionStarted) return;
  completionStarted = true;
  setStatus("Confirming browsing access…");

  if (!sessionStorageAvailable()) {
    setStatus("Verification is unavailable in this browser. Please restart from the age gate.");
    return;
  }

  const params = parseAllowlistedCallbackParams();
  const flowId = typeof params[GTB_PARAM] === "string" ? params[GTB_PARAM].trim() : "";
  const browseReceipt = typeof params.browse_receipt === "string" ? params.browse_receipt.trim() : "";

  if (!flowId || !browseReceipt) {
    setStatus(GENERIC_FAILURE);
    return;
  }

  const verifier = session.getItem(verifierStorageKey(flowId));
  if (!verifier) {
    setStatus(RESTART_MESSAGE);
    return;
  }

  try {
    const result = await completeBrowseVerification(browseReceipt, flowId, verifier);

    if (result?.verified === true && result?.purpose === "browse") {
      clearVerifier(flowId);
      setBrowseAccessState();
      setStatus(SUCCESS_MESSAGE);
      restoreReturnDestination();
      return;
    }

    if (result?.code === "receipt_fetch_transient_failure" && result?.retryable === true) {
      setStatus("Still confirming browsing access. Please wait a moment…");
      completionStarted = false;
      setTimeout(() => { void handleCallback(); }, 2000);
      return;
    }

    clearVerifier(flowId);
    setStatus(GENERIC_FAILURE);
  } catch {
    clearVerifier(flowId);
    setStatus(GENERIC_FAILURE);
  }
}

```

### pages/AgeVerificationResult.js

- **Wix destination:** Page code
- **Wix path/name:** `Age Verification Result page`

```javascript
// FILE: examples/good-trouble-wix/pages/AgeVerificationResult.js
// Wix Velo page code — /age-verification-result callback page.
//
// Required element ID:
// #abraxasStatusText
//
// Optional element ID:
// #restartAbraxasButton

import { completePurchaseVerification } from "backend/abraxasVerification.web";

import {
  GTV_PARAM,
  PURCHASE_RETURN_DESTINATION_STORAGE_KEY,
  PURCHASE_VERIFIED_SESSION_FLAG,
  PURCHASE_VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import wixLocation from "wix-location";

import {
  session,
} from "wix-storage-frontend";

/**
 * Abraxas callback parameters.
 * Never treat status=approved by itself as verification.
 */
const ALLOWED_CALLBACK_PARAMS =
  new Set([
    "status",
    "decision_id",
    "receipt_id",
    "receipt_expires_at",
    "credential_id",
    "policy_id",
    "partner_id",
    GTV_PARAM,
  ]);

const GENERIC_FAILURE =
  "Verification could not be completed. Please try again or use the traditional age option.";

const RESTART_MESSAGE =
  "This verification was opened in a different browser or tab. Please start again from the age gate.";

const SUCCESS_MESSAGE =
  "Age verification complete. Returning you to Good Trouble…";

let completionStarted = false;

$w.onReady(() => {
  configureRestartButton();
  void handleCallback();
});

function configureRestartButton() {
  const restartButton =
    $w("#restartAbraxasButton");

  if (!restartButton) {
    return;
  }

  restartButton.hide();

  restartButton.onClick(() => {
    wixLocation.to("/");
  });
}

function setStatus(message) {
  const statusText =
    $w("#abraxasStatusText");

  if (statusText) {
    statusText.text =
      message;
  }
}

function showRestart() {
  const restartButton =
    $w("#restartAbraxasButton");

  if (restartButton) {
    restartButton.show();
  }
}

function sessionStorageAvailable() {
  try {
    const probe =
      "__abraxas_gt_probe__";

    session.setItem(
      probe,
      "1"
    );

    session.removeItem(
      probe
    );

    return true;
  } catch {
    return false;
  }
}

function verifierStorageKey(flowId) {
  return `${PURCHASE_VERIFIER_STORAGE_PREFIX}${flowId}`;
}

function parseAllowlistedCallbackParams() {
  const query =
    wixLocation.query;

  const parsed = {};

  for (
    const key of Object.keys(query)
  ) {
    if (
      ALLOWED_CALLBACK_PARAMS.has(key)
    ) {
      parsed[key] =
        query[key];
    }
  }

  return parsed;
}

function clearVerifier(flowId) {
  try {
    session.removeItem(
      verifierStorageKey(flowId)
    );
  } catch {
    // The verifier will expire with the session.
  }
}

/**
 * Pilot UI convenience only.
 *
 * This session flag is not accepted by Abraxas or the Wix backend
 * as authoritative proof and does not independently authorize
 * regulated purchases or other restricted activity.
 */
function setPurchaseVerifiedState() {
  try {
    session.setItem(
      PURCHASE_VERIFIED_SESSION_FLAG,
      "1"
    );
  } catch {
    // Fail closed. The user can restart the flow.
  }
}

function restoreReturnDestination() {
  try {
    const destination =
      session.getItem(
        PURCHASE_RETURN_DESTINATION_STORAGE_KEY
      );

    session.removeItem(
      PURCHASE_RETURN_DESTINATION_STORAGE_KEY
    );

    if (
      destination &&
      typeof destination === "string" &&
      destination.startsWith("/") &&
      !destination.startsWith("//")
    ) {
      setTimeout(() => {
        wixLocation.to(destination);
      }, 1200);

      return;
    }

    setTimeout(() => {
      wixLocation.to("/");
    }, 1200);
  } catch {
    // Keep the success message visible if navigation fails.
  }
}

async function handleCallback() {
  if (completionStarted) {
    return;
  }

  completionStarted = true;

  setStatus(
    "Completing verification…"
  );

  if (!sessionStorageAvailable()) {
    setStatus(
      "Verification is unavailable in this browser. Please restart from the age gate."
    );

    showRestart();
    return;
  }

  const params =
    parseAllowlistedCallbackParams();

  const rawFlowId =
    params[GTV_PARAM];

  const rawReceiptId =
    params.receipt_id;

  const flowId =
    typeof rawFlowId === "string"
      ? rawFlowId.trim()
      : "";

  const receiptId =
    typeof rawReceiptId === "string"
      ? rawReceiptId.trim()
      : "";

  if (!flowId || !receiptId) {
    setStatus(
      GENERIC_FAILURE
    );

    showRestart();
    return;
  }

  const verifier =
    session.getItem(
      verifierStorageKey(flowId)
    );

  if (!verifier) {
    setStatus(
      RESTART_MESSAGE
    );

    showRestart();
    return;
  }

  try {
    const result =
      await completePurchaseVerification(
        receiptId,
        flowId,
        verifier
      );

    if (result?.verified === true && result?.purpose === "purchase") {
      clearVerifier(flowId);
      setPurchaseVerifiedState();

      setStatus(
        SUCCESS_MESSAGE
      );

      restoreReturnDestination();
      return;
    }

    if (
      result?.code ===
        "receipt_fetch_transient_failure" &&
      result?.retryable === true
    ) {
      setStatus(
        "Still confirming verification. Please wait a moment…"
      );

      completionStarted = false;

      setTimeout(() => {
        void handleCallback();
      }, 2000);

      return;
    }

    clearVerifier(flowId);

    if (
      result?.code ===
        "verifier_mismatch" ||
      result?.code ===
        "missing_verifier"
    ) {
      setStatus(
        RESTART_MESSAGE
      );
    } else {
      setStatus(
        GENERIC_FAILURE
      );
    }

    showRestart();
  } catch {
    clearVerifier(flowId);

    setStatus(
      GENERIC_FAILURE
    );

    showRestart();
  }
}
```

### pages/PurchaseVerificationEntry.js

- **Wix destination:** Page code
- **Wix path/name:** `Purchase Verification Entry page`

```javascript
// FILE: examples/good-trouble-wix/pages/PurchaseVerificationEntry.js
// Wix Velo page code — regulated purchase eligibility (L2+) entry point.

import { createPurchaseVerificationStart } from "backend/abraxasVerification.web";

import {
  PURCHASE_RETURN_DESTINATION_STORAGE_KEY,
  PURCHASE_VERIFIER_STORAGE_PREFIX,
} from "public/abraxasClientConstants";

import { createPurchaseVerificationController } from "public/purchaseVerificationLogic";

import wixLocationFrontend from "wix-location-frontend";
import wixWindow from "wix-window";
import wixWindowFrontend from "wix-window-frontend";
import { session } from "wix-storage-frontend";

/** @type {ReturnType<typeof createPurchaseVerificationController> | null} */
let purchaseController = null;

$w.onReady(() => {
  if (wixWindow.rendering.env !== "browser") return;
  wirePurchaseButton();
});

function wirePurchaseButton() {
  const button = $w("#purchaseAbraxasButton");
  if (!button) return;

  purchaseController = createPurchaseVerificationController({
    setStatus(message) {
      const status = $w("#purchaseStatusText");
      if (status) status.text = message;
    },

    startPurchaseVerification: () => createPurchaseVerificationStart(),

    getViewMode: () => wixWindowFrontend.viewMode,

    storeVerifier(flowId, verifier) {
      session.setItem(`${PURCHASE_VERIFIER_STORAGE_PREFIX}${flowId}`, verifier);
    },

    saveReturnDestination() {
      try {
        const currentUrl = String(wixLocationFrontend.url || "");
        const path = currentUrl.split("?")[0].replace(/^https?:\/\/[^/]+/, "") || "/";
        session.setItem(PURCHASE_RETURN_DESTINATION_STORAGE_KEY, path);
      } catch {
        // non-authoritative
      }
    },

    navigateToVerifyUrl(url) {
      wixLocationFrontend.to(url);
    },
  });

  button.onClick(() => {
    void purchaseController?.start();
  });
}
```
### backend/abraxasVerification.web.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/abraxasVerification.web.js`

```javascript
// FILE: examples/good-trouble-wix/backend/abraxasVerification.web.js
// Wix Velo web methods — separate browse (L0) and purchase (L2+) lifecycles.

import { Permissions, webMethod } from "wix-web-module";
import {
  completeBrowseVerificationService,
  completePurchaseVerificationService,
  createBrowseVerificationStartService,
  createPurchaseVerificationStartService,
} from "./abraxasVerificationService.js";

export const createBrowseVerificationStart = webMethod(
  Permissions.Anyone,
  async () => createBrowseVerificationStartService(null, { skipCaptcha: true }),
);

export const createPurchaseVerificationStart = webMethod(
  Permissions.Anyone,
  async () => createPurchaseVerificationStartService(null, { skipCaptcha: true }),
);

/** @deprecated Use createPurchaseVerificationStart for regulated purchase flows. */
export const createAbraxasVerificationStart = createPurchaseVerificationStart;

export const completeBrowseVerification = webMethod(
  Permissions.Anyone,
  async (browseReceipt, flowId, verifier) =>
    completeBrowseVerificationService(browseReceipt, flowId, verifier),
);

export const completePurchaseVerification = webMethod(
  Permissions.Anyone,
  async (receiptId, flowId, verifier) =>
    completePurchaseVerificationService(receiptId, flowId, verifier),
);

/** @deprecated Use completePurchaseVerification */
export const completeAbraxasVerification = completePurchaseVerification;

```

### backend/abraxasVerificationService.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/abraxasVerificationService.js`

```javascript
// FILE: examples/good-trouble-wix/backend/abraxasVerificationService.js
// Testable Abraxas verification service — separate browse (L0) and purchase (L2+) lifecycles.

import { fetchAndValidateSandboxReceipt } from "./abraxasReceiptValidator.js";
import { verifyBrowseReceiptRemotely } from "./browseReceiptRemoteValidator.js";
import { authorizeCaptchaToken } from "./captchaGate.js";
import { MAX_OUTSTANDING_PENDING_FLOWS } from "./constants.js";
import {
  buildFlowStartFailure,
  buildFlowStartSuccess,
  flowStartContext,
  FLOW_START_STAGES,
  mapThrownErrorToStartCode,
} from "./flowStartDiagnostics.js";
import {
  assertCapacityAvailable,
  finalizeFlowStart,
} from "./flowCapacity.js";
import {
  buildVerificationStartPayload,
  completeAbraxasVerificationCore,
  completeBrowseVerificationCore,
} from "./nonceLifecycle.js";
import { sha256Hex as defaultSha256Hex } from "./sha256Adapter.js";

/** @type {((value: string) => Promise<string> | string) | null} */
let configuredHashFn = null;

export function configureAbraxasHashFn(hashFn) {
  configuredHashFn = hashFn;
}

export function __testOnlySetHashFn(hashFn) {
  configuredHashFn = hashFn;
}

function resolveHashFn(depsHashFn) {
  if (depsHashFn) return depsHashFn;
  if (configuredHashFn) return configuredHashFn;
  return defaultSha256Hex;
}

async function resolveStore(deps) {
  if (deps.store) return deps.store;
  const { createWixNonceStore } = await import("./wixNonceStore.js");
  return createWixNonceStore();
}

/**
 * @param {"browse" | "purchase"} purpose
 * @param {string | null | undefined} captchaToken
 * @param {object} [deps]
 */
async function startFlow(purpose, captchaToken, deps = {}) {
  const context = flowStartContext(purpose);

  try {
    if (!deps.skipCaptcha) {
      const captcha = await authorizeCaptchaToken(captchaToken, deps.authorizeCaptcha);
      if (!captcha.ok) {
        return buildFlowStartFailure({
          code: captcha.code,
          stage: FLOW_START_STAGES.CAPTCHA_GATE,
          purpose: context.purpose,
          policyId: context.policyId,
        });
      }
    }

    const store = await resolveStore(deps);
    const hashFn = resolveHashFn(deps.hashFn);
    const now = deps.now ?? new Date();

    const capacity = await assertCapacityAvailable(store, MAX_OUTSTANDING_PENDING_FLOWS, now);
    if (!capacity.ok) {
      return buildFlowStartFailure({
        code: capacity.code,
        stage: FLOW_START_STAGES.CAPACITY_PRECHECK,
        purpose: context.purpose,
        policyId: context.policyId,
      });
    }

    let payload;
    try {
      payload = await buildVerificationStartPayload({ hashFn, now, purpose });
    } catch {
      return buildFlowStartFailure({
        code: "payload_build_failed",
        stage: FLOW_START_STAGES.PAYLOAD_BUILD,
        purpose: context.purpose,
        policyId: context.policyId,
      });
    }

    let inserted;
    try {
      inserted = await store.insert(payload.flowRecord);
    } catch {
      return buildFlowStartFailure({
        code: "nonce_insert_failed",
        stage: FLOW_START_STAGES.NONCE_INSERT,
        purpose: context.purpose,
        policyId: context.policyId,
        correlationId: payload.flowRecord.correlationId,
      });
    }

    const finalized = await finalizeFlowStart(
      store,
      inserted._id,
      MAX_OUTSTANDING_PENDING_FLOWS,
      now,
    );
    if (!finalized.ok) {
      return buildFlowStartFailure({
        code: finalized.code,
        stage: FLOW_START_STAGES.CAPACITY_FINALIZE,
        purpose: context.purpose,
        policyId: context.policyId,
        correlationId: payload.flowRecord.correlationId,
      });
    }

    return buildFlowStartSuccess({
      verifyUrl: payload.verifyUrl,
      flowId: payload.flowId,
      verifier: payload.verifier,
      purpose: payload.purpose,
      policyId: payload.policyId,
      correlationId: payload.flowRecord.correlationId,
    });
  } catch (error) {
    return buildFlowStartFailure({
      code: mapThrownErrorToStartCode(error),
      stage: FLOW_START_STAGES.CAPACITY_PRECHECK,
      purpose: context.purpose,
      policyId: context.policyId,
    });
  }
}

export async function createBrowseVerificationStartService(captchaToken, deps = {}) {
  return startFlow("browse", captchaToken, deps);
}

export async function createPurchaseVerificationStartService(captchaToken, deps = {}) {
  return startFlow("purchase", captchaToken, deps);
}

/** @deprecated Use createPurchaseVerificationStartService */
export async function createAbraxasVerificationStartService(captchaToken, deps = {}) {
  return createPurchaseVerificationStartService(captchaToken, {
    ...deps,
    skipCaptcha: deps.skipCaptcha ?? true,
  });
}

export async function completePurchaseVerificationService(receiptId, flowId, verifier, deps = {}) {
  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);

  const defaultValidateReceipt = async (id) => {
    try {
      const result = await fetchAndValidateSandboxReceipt(id);
      return { verified: result.verified, transientFailure: false };
    } catch {
      return { verified: false, transientFailure: true };
    }
  };

  return completeAbraxasVerificationCore({
    store,
    receiptId,
    flowId,
    verifier,
    hashFn,
    validateReceipt: deps.validateReceipt ?? defaultValidateReceipt,
  });
}

export async function completeBrowseVerificationService(browseReceipt, flowId, verifier, deps = {}) {
  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);

  const defaultValidateBrowse = async (token, record) => {
    const result = await verifyBrowseReceiptRemotely(token, { fetchImpl: deps.fetchImpl });
    if (result.transientFailure) {
      return { verified: false, transientFailure: true };
    }
    if (!result.verified) {
      return { verified: false, transientFailure: false };
    }
    if (record?.policyId && result.payload?.policy_id !== record.policyId) {
      return { verified: false, transientFailure: false };
    }
    return { verified: true, transientFailure: false };
  };

  return completeBrowseVerificationCore({
    store,
    browseReceipt,
    flowId,
    verifier,
    hashFn,
    validateBrowseReceipt: deps.validateBrowseReceipt ?? defaultValidateBrowse,
  });
}

/** @deprecated Use completePurchaseVerificationService */
export async function completeAbraxasVerificationService(receiptId, flowId, verifier, deps = {}) {
  return completePurchaseVerificationService(receiptId, flowId, verifier, deps);
}
```
### backend/constants.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/constants.js`

```javascript
// FILE: examples/good-trouble-wix/backend/constants.js
// Shared Good Trouble × Abraxas backend integration constants.

export const ABRAXAS_ORIGIN =
  "https://abraxasworld.xyz";

export const PARTNER_ID =
  "good-trouble-cannabis";

export const POLICY_ID =
  "good-trouble-retail-v1";

/** Tier 1 browse policy — L0 self-attestation only (not purchase). */
export const BROWSE_POLICY_ID =
  "good-trouble-browse-v1";

export const FLOW_PURPOSE_BROWSE = "browse";
export const FLOW_PURPOSE_PURCHASE = "purchase";

/** Purchase / regulated eligibility callback. */
export const PURCHASE_RETURN_URL_BASE =
  "https://www.goodtroublecanna.com/age-verification-result";

/** Browse / L0 self-attestation callback — separate from purchase. */
export const BROWSE_RETURN_URL_BASE =
  "https://www.goodtroublecanna.com/browse-verification-result";

/** @deprecated Use PURCHASE_RETURN_URL_BASE */
export const RETURN_URL_BASE = PURCHASE_RETURN_URL_BASE;

export const NONCE_COLLECTION =
  "AbraxasVerificationNonces";

/**
 * Verification-flow lifetime: 10 minutes.
 */
export const FLOW_TTL_MS =
  10 * 60 * 1000;

/**
 * Maximum period for claiming a pending validation operation.
 */
export const CLAIM_TTL_MS =
  2 * 60 * 1000;

/**
 * Bounded receipt-fetch retries while the flow remains pending.
 * A temporary fetch failure must never grant verification.
 */
export const MAX_VALIDATION_ATTEMPTS = 3;

/**
 * Soft limit on concurrent pending verification flows.
 */
export const MAX_OUTSTANDING_PENDING_FLOWS = 100;

/**
 * Consumed flow records may be purged after 24 hours.
 */
export const CONSUMED_FLOW_RETENTION_MS =
  24 * 60 * 60 * 1000;

/**
 * Browser-safe constants live in the public module so Wix page code
 * never imports from a backend-only file.
 */
export {
  GTB_PARAM,
  GTV_PARAM,
  BROWSE_ACCESS_STORAGE_KEY,
  BROWSE_RETURN_DESTINATION_STORAGE_KEY,
  BROWSE_VERIFIER_STORAGE_PREFIX,
  PURCHASE_RETURN_DESTINATION_STORAGE_KEY,
  PURCHASE_VERIFIED_SESSION_FLAG,
  PURCHASE_VERIFIER_STORAGE_PREFIX,
  PILOT_VERIFIED_SESSION_FLAG,
  RETURN_DESTINATION_STORAGE_KEY,
  VERIFIER_STORAGE_PREFIX,
} from "../public/abraxasClientConstants.js";

/**
 * The current Good Trouble pilot uses sandbox receipt validation.
 * This is not production-authoritative age verification.
 */
export const RECEIPT_VALIDATION_MODE =
  "sandbox";

export const FLOW_ID_PREFIX_PURCHASE = "gtf_";
export const FLOW_ID_PREFIX_BROWSE = "gtb_";

/** @deprecated Use FLOW_ID_PREFIX_PURCHASE */
export const FLOW_ID_PREFIX = FLOW_ID_PREFIX_PURCHASE;

export const VERIFIER_BYTES = 32;

/** Purchase (gtf_) and browse (gtb_) opaque flow identifiers. */
export const FLOW_ID_RE = /^(gtf|gtb)_[a-f0-9]{64}$/;

/**
 * High-entropy verifier:
 * 64 lowercase hexadecimal characters representing 32 bytes.
 */
export const VERIFIER_RE =
  /^[a-f0-9]{64}$/;

/**
 * Abraxas decision-receipt identifier.
 */
export const RECEIPT_ID_RE =
  /^dr_[A-Za-z0-9_-]{8,128}$/;

export const MAX_INPUT_LENGTH = {
  flowId: 80,
  verifier: 128,
  receiptId: 200,
};

/**
 * Backend verification-flow lifecycle states.
 */
export const NONCE_STATE = {
  PENDING: "pending",
  VALIDATING: "validating",
  CONSUMED: "consumed",
};

/**
 * Legacy alias retained for existing integration documentation.
 */
export const NONCE_TTL_MS =
  FLOW_TTL_MS;
```

### backend/nonceLifecycle.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/nonceLifecycle.js`

```javascript
// FILE: examples/good-trouble-wix/backend/nonceLifecycle.js
// Backend-only flow lifecycle with PKCE proof-of-possession and pending → validating → consumed states.

import { randomBytes } from "node:crypto";
import {
  ABRAXAS_ORIGIN,
  CLAIM_TTL_MS,
  FLOW_TTL_MS,
  MAX_VALIDATION_ATTEMPTS,
  NONCE_STATE,
  RECEIPT_VALIDATION_MODE,
  VERIFIER_BYTES,
} from "./constants.js";
import { BROWSE_FLOW, PURCHASE_FLOW } from "./flowPurpose.js";
import {
  validateFlowId,
  validateReceiptId,
  validateVerifier,
  verifyVerifierChallenge,
} from "./pkceProof.js";

function randomHex(byteLength) {
  return randomBytes(byteLength).toString("hex");
}

/**
 * @typedef {object} FlowRecord
 * @property {string} _id
 * @property {string} flowId
 * @property {string} verifierChallenge
 * @property {string} state
 * @property {Date} createdAt
 * @property {Date} expiresAt
 * @property {Date | null} [claimExpiresAt]
 * @property {string | null} [claimToken]
 * @property {number} [validationAttempts]
 * @property {Date | null} [consumedAt]
 * @property {string} correlationId
 * @property {"browse" | "purchase"} purpose
 * @property {string} policyId
 */

/**
 * @typedef {object} FlowStore
 * @property {(record: Omit<FlowRecord, "_id">) => Promise<FlowRecord>} insert
 * @property {(flowId: string) => Promise<FlowRecord | null>} findByFlowId
 * @property {(recordId: string, patch: Partial<FlowRecord>, guards?: { expectedState?: string, flowId?: string }) => Promise<FlowRecord | null>} updateGuarded
 * @property {(now?: Date) => Promise<number>} [countPending]
 * @property {(recordId: string) => Promise<void>} [removeById]
 * @property {(now?: Date) => Promise<number>} [purgeStale]
 */

/**
 * @param {string} value
 * @param {(input: string) => Promise<string> | string} hashFn
 */
export async function hashValue(value, hashFn) {
  return typeof hashFn === "function" ? hashFn(value) : value;
}

/**
 * Build Partner Flow entry URL. Callback carries opaque flowId — never the verifier.
 * @param {{ hashFn: (v: string) => Promise<string> | string, now?: Date, purpose?: "browse" | "purchase" }} params
 */
export async function buildVerificationStartPayload(params) {
  const flowConfig = params.purpose === "browse" ? BROWSE_FLOW : PURCHASE_FLOW;
  const now = params.now ?? new Date();
  const verifier = randomHex(VERIFIER_BYTES);
  const flowId = `${flowConfig.flowIdPrefix}${randomHex(VERIFIER_BYTES)}`;
  const verifierChallenge = await hashValue(verifier, params.hashFn);
  const expiresAt = new Date(now.getTime() + FLOW_TTL_MS);
  const correlationId = randomHex(8);

  const returnUrl = `${flowConfig.returnUrlBase}?${flowConfig.callbackParam}=${encodeURIComponent(flowId)}`;
  const search = new URLSearchParams({
    partner_id: flowConfig.partnerId,
    policy_id: flowConfig.policyId,
    return_url: returnUrl,
  });
  if (flowConfig.purpose === "browse") {
    search.set("purpose", "browse");
  }

  return {
    verifyUrl: `${ABRAXAS_ORIGIN}/partner/verify?${search.toString()}`,
    flowId,
    purpose: flowConfig.purpose,
    policyId: flowConfig.policyId,
    /** Returned over TLS web method only — frontend stores in sessionStorage, never in URL. */
    verifier,
    flowRecord: {
      flowId,
      verifierChallenge,
      state: NONCE_STATE.PENDING,
      purpose: flowConfig.purpose,
      policyId: flowConfig.policyId,
      createdAt: now,
      expiresAt,
      claimExpiresAt: null,
      claimToken: null,
      validationAttempts: 0,
      consumedAt: null,
      correlationId,
    },
  };
}

/**
 * Atomically claim a pending flow after PKCE verifier proof.
 * @returns {Promise<{ ok: true, record: FlowRecord } | { ok: false, code: string }>}
 */
export async function claimPendingFlow(store, params) {
  const now = params.now ?? new Date();
  const flowCheck = validateFlowId(params.flowId);
  if (!flowCheck.ok) return { ok: false, code: flowCheck.code };

  const verifierCheck = validateVerifier(params.verifier);
  if (!verifierCheck.ok) return { ok: false, code: verifierCheck.code };

  const record = await store.findByFlowId(flowCheck.flowId);
  if (!record) return { ok: false, code: "flow_not_found" };
  if (record.state === NONCE_STATE.CONSUMED) return { ok: false, code: "flow_already_consumed" };
  if (record.expiresAt.getTime() <= now.getTime()) return { ok: false, code: "flow_expired" };

  const proof = await verifyVerifierChallenge(
    verifierCheck.verifier,
    record.verifierChallenge,
    params.hashFn,
  );
  if (!proof.ok) return { ok: false, code: proof.code };

  if (record.state === NONCE_STATE.VALIDATING) {
    if (record.claimExpiresAt && record.claimExpiresAt.getTime() > now.getTime()) {
      return { ok: false, code: "flow_claim_in_progress" };
    }
    const released = await store.updateGuarded(record._id, {
      state: NONCE_STATE.PENDING,
      claimToken: null,
      claimExpiresAt: null,
    }, { expectedState: NONCE_STATE.VALIDATING, flowId: flowCheck.flowId });
    if (!released) return { ok: false, code: "flow_claim_in_progress" };
  }

  if (record.state !== NONCE_STATE.PENDING && record.state !== NONCE_STATE.VALIDATING) {
    return { ok: false, code: "flow_invalid_state" };
  }

  const claimToken = randomHex(16);
  const claimExpiresAt = new Date(now.getTime() + CLAIM_TTL_MS);
  const claimed = await store.updateGuarded(record._id, {
    state: NONCE_STATE.VALIDATING,
    claimToken,
    claimExpiresAt,
    validationAttempts: (record.validationAttempts ?? 0) + 1,
  }, { expectedState: NONCE_STATE.PENDING, flowId: flowCheck.flowId });

  if (!claimed || claimed.claimToken !== claimToken) {
    return { ok: false, code: "concurrent_completion_rejected" };
  }

  return { ok: true, record: claimed };
}

/**
 * @returns {Promise<{ ok: true, record: FlowRecord } | { ok: false, code: string }>}
 */
export async function markFlowConsumed(store, record, now = new Date()) {
  const consumed = await store.updateGuarded(record._id, {
    state: NONCE_STATE.CONSUMED,
    consumedAt: now,
    claimToken: null,
    claimExpiresAt: null,
  }, { expectedState: NONCE_STATE.VALIDATING, flowId: record.flowId });

  if (!consumed) return { ok: false, code: "consume_failed" };
  return { ok: true, record: consumed };
}

/**
 * Release validating claim after transient receipt-fetch failure (bounded retries, never grants verification).
 */
export async function releaseValidatingClaim(store, record) {
  if ((record.validationAttempts ?? 0) >= MAX_VALIDATION_ATTEMPTS) {
    return markFlowConsumed(store, record);
  }

  const released = await store.updateGuarded(record._id, {
    state: NONCE_STATE.PENDING,
    claimToken: null,
    claimExpiresAt: null,
  }, { expectedState: NONCE_STATE.VALIDATING, flowId: record.flowId });

  return released
    ? { ok: true, record: released, released: true }
    : { ok: false, code: "release_failed" };
}

function resolveRecordPurpose(record) {
  if (record.purpose) return record.purpose;
  if (record.flowId?.startsWith("gtb_")) return "browse";
  return "purchase";
}

/**
 * @param {object} params
 * @param {FlowStore} params.store
 * @param {string} params.receiptId
 * @param {string} params.flowId opaque gtv flow identifier from callback URL
 * @param {string} params.verifier from sessionStorage (same browser context)
 * @param {(input: string) => Promise<string> | string} params.hashFn
 * @param {(receiptId: string) => Promise<{ verified: boolean, transientFailure?: boolean }>} params.validateReceipt
 * @param {Date} [params.now]
 */
export async function completeAbraxasVerificationCore(params) {
  const receiptCheck = validateReceiptId(params.receiptId);
  if (!receiptCheck.ok) {
    return { verified: false, code: receiptCheck.code };
  }

  const flowCheck = validateFlowId(params.flowId);
  if (!flowCheck.ok) {
    return { verified: false, code: flowCheck.code };
  }

  const verifierCheck = validateVerifier(params.verifier);
  if (!verifierCheck.ok) {
    return { verified: false, code: verifierCheck.code };
  }

  const claim = await claimPendingFlow(params.store, {
    flowId: flowCheck.flowId,
    verifier: verifierCheck.verifier,
    hashFn: params.hashFn,
    now: params.now,
  });
  if (!claim.ok) {
    return { verified: false, code: claim.code };
  }

  if (resolveRecordPurpose(claim.record) !== "purchase") {
    await markFlowConsumed(params.store, claim.record, params.now);
    return { verified: false, code: "flow_purpose_mismatch" };
  }

  const validation = await params.validateReceipt(
    receiptCheck.receiptId,
    claim.record,
  );
  if (validation.transientFailure) {
    const release = await releaseValidatingClaim(params.store, claim.record);
    return {
      verified: false,
      code: release.released ? "receipt_fetch_transient_failure" : "flow_exhausted",
      retryable: Boolean(release.released),
    };
  }

  if (!validation.verified) {
    await markFlowConsumed(params.store, claim.record, params.now);
    return { verified: false, code: "receipt_invalid" };
  }

  const consumed = await markFlowConsumed(params.store, claim.record, params.now);
  if (!consumed.ok) {
    return { verified: false, code: consumed.code };
  }

  return {
    verified: true,
    code: "verified",
    purpose: "purchase",
    policyId: claim.record.policyId,
    flowConsumed: true,
  };
}

/**
 * Complete browse callback — JWT browse receipt + PKCE; purpose must be browse.
 * @param {object} params
 * @param {FlowStore} params.store
 * @param {string} params.browseReceipt
 * @param {string} params.flowId
 * @param {string} params.verifier
 * @param {(input: string) => Promise<string> | string} params.hashFn
 * @param {(token: string, record: FlowRecord) => Promise<{ verified: boolean, transientFailure?: boolean }>} params.validateBrowseReceipt
 * @param {Date} [params.now]
 */
export async function completeBrowseVerificationCore(params) {
  const token = typeof params.browseReceipt === "string" ? params.browseReceipt.trim() : "";
  if (!token || token.length > 8192) {
    return { verified: false, code: "missing_browse_receipt" };
  }

  const flowCheck = validateFlowId(params.flowId);
  if (!flowCheck.ok) {
    return { verified: false, code: flowCheck.code };
  }

  const verifierCheck = validateVerifier(params.verifier);
  if (!verifierCheck.ok) {
    return { verified: false, code: verifierCheck.code };
  }

  const claim = await claimPendingFlow(params.store, {
    flowId: flowCheck.flowId,
    verifier: verifierCheck.verifier,
    hashFn: params.hashFn,
    now: params.now,
  });
  if (!claim.ok) {
    return { verified: false, code: claim.code };
  }

  if (resolveRecordPurpose(claim.record) !== "browse") {
    await markFlowConsumed(params.store, claim.record, params.now);
    return { verified: false, code: "flow_purpose_mismatch" };
  }

  const validation = await params.validateBrowseReceipt(token, claim.record);
  if (validation.transientFailure) {
    const release = await releaseValidatingClaim(params.store, claim.record);
    return {
      verified: false,
      code: release.released ? "receipt_fetch_transient_failure" : "flow_exhausted",
      retryable: Boolean(release.released),
    };
  }

  if (!validation.verified) {
    await markFlowConsumed(params.store, claim.record, params.now);
    return { verified: false, code: "browse_receipt_invalid" };
  }

  const consumed = await markFlowConsumed(params.store, claim.record, params.now);
  if (!consumed.ok) {
    return { verified: false, code: consumed.code };
  }

  return {
    verified: true,
    code: "verified",
    purpose: "browse",
    policyId: claim.record.policyId,
    flowConsumed: true,
  };
}

export const INTEGRATION_CONSTANTS = {
  mode: RECEIPT_VALIDATION_MODE,
  browse: BROWSE_FLOW,
  purchase: PURCHASE_FLOW,
};

```

### backend/flowPurpose.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/flowPurpose.js`

```javascript
// FILE: examples/good-trouble-wix/backend/flowPurpose.js
// Explicit browse (L0) vs purchase (L2+) verification lifecycles.

import {
  BROWSE_POLICY_ID,
  BROWSE_RETURN_URL_BASE,
  FLOW_ID_PREFIX_BROWSE,
  FLOW_ID_PREFIX_PURCHASE,
  GTB_PARAM,
  GTV_PARAM,
  PARTNER_ID,
  POLICY_ID,
  PURCHASE_RETURN_URL_BASE,
} from "./constants.js";

/** @typedef {"browse" | "purchase"} FlowPurpose */

/**
 * @typedef {object} FlowPurposeConfig
 * @property {FlowPurpose} purpose
 * @property {string} policyId
 * @property {string} partnerId
 * @property {string} returnUrlBase
 * @property {string} flowIdPrefix
 * @property {string} callbackParam
 * @property {string} assuranceLabel
 */

export const BROWSE_FLOW = {
  purpose: "browse",
  policyId: BROWSE_POLICY_ID,
  partnerId: PARTNER_ID,
  returnUrlBase: BROWSE_RETURN_URL_BASE,
  flowIdPrefix: FLOW_ID_PREFIX_BROWSE,
  callbackParam: GTB_PARAM,
  assuranceLabel: "L0",
};

export const PURCHASE_FLOW = {
  purpose: "purchase",
  policyId: POLICY_ID,
  partnerId: PARTNER_ID,
  returnUrlBase: PURCHASE_RETURN_URL_BASE,
  flowIdPrefix: FLOW_ID_PREFIX_PURCHASE,
  callbackParam: GTV_PARAM,
  assuranceLabel: "L2+",
};

/** @param {unknown} purpose */
export function resolveFlowPurposeConfig(purpose) {
  const value = typeof purpose === "string" ? purpose.trim().toLowerCase() : "";
  if (value === "browse") return BROWSE_FLOW;
  if (value === "purchase") return PURCHASE_FLOW;
  return null;
}

/**
 * @param {FlowPurposeConfig} config
 * @param {string} flowId
 */
export function buildPartnerVerifyUrl(config, flowId) {
  const returnUrl = `${config.returnUrlBase}?${config.callbackParam}=${encodeURIComponent(flowId)}`;
  const search = new URLSearchParams({
    partner_id: config.partnerId,
    policy_id: config.policyId,
    return_url: returnUrl,
  });
  if (config.purpose === "browse") {
    search.set("purpose", "browse");
  }
  return `https://abraxasworld.xyz/partner/verify?${search.toString()}`;
}

```

### backend/pkceProof.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/pkceProof.js`

```javascript
// FILE: examples/good-trouble-wix/backend/pkceProof.js
// PKCE-style proof-of-possession — never trust frontend-supplied visitor identity.

import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import {
  FLOW_ID_RE,
  MAX_INPUT_LENGTH,
  RECEIPT_ID_RE,
  VERIFIER_RE,
} from "./constants.js";

/**
 * Timing-safe string equality.
 * @param {string} a
 * @param {string} b
 */
export function timingSafeEqualStrings(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return nodeTimingSafeEqual(bufA, bufB);
  } catch {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i += 1) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}

/**
 * @param {unknown} flowId
 * @returns {{ ok: true, flowId: string } | { ok: false, code: string }}
 */
export function validateFlowId(flowId) {
  const trimmed = typeof flowId === "string" ? flowId.trim() : "";
  if (!trimmed || trimmed.length > MAX_INPUT_LENGTH.flowId) {
    return { ok: false, code: "invalid_flow_id" };
  }
  if (!FLOW_ID_RE.test(trimmed)) {
    return { ok: false, code: "invalid_flow_id" };
  }
  return { ok: true, flowId: trimmed };
}

/**
 * @param {unknown} verifier
 * @returns {{ ok: true, verifier: string } | { ok: false, code: string }}
 */
export function validateVerifier(verifier) {
  const trimmed = typeof verifier === "string" ? verifier.trim() : "";
  if (!trimmed || trimmed.length > MAX_INPUT_LENGTH.verifier) {
    return { ok: false, code: "missing_verifier" };
  }
  if (!VERIFIER_RE.test(trimmed)) {
    return { ok: false, code: "invalid_verifier" };
  }
  return { ok: true, verifier: trimmed };
}

/**
 * @param {unknown} receiptId
 * @returns {{ ok: true, receiptId: string } | { ok: false, code: string }}
 */
export function validateReceiptId(receiptId) {
  const trimmed = typeof receiptId === "string" ? receiptId.trim() : "";
  if (!trimmed || trimmed.length > MAX_INPUT_LENGTH.receiptId) {
    return { ok: false, code: "missing_receipt_id" };
  }
  if (!RECEIPT_ID_RE.test(trimmed)) {
    return { ok: false, code: "invalid_receipt_id" };
  }
  return { ok: true, receiptId: trimmed };
}

/**
 * Verify PKCE proof-of-possession: SHA-256(verifier) must match stored challenge.
 * @param {string} verifier
 * @param {string} storedChallenge
 * @param {(input: string) => Promise<string> | string} hashFn
 */
export async function verifyVerifierChallenge(verifier, storedChallenge, hashFn) {
  const derived = await hashFn(verifier);
  if (!timingSafeEqualStrings(derived, storedChallenge)) {
    return { ok: false, code: "verifier_mismatch" };
  }
  return { ok: true };
}

```

### backend/sha256Adapter.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/sha256Adapter.js`

```javascript
// FILE: examples/good-trouble-wix/backend/sha256Adapter.js
// Backend-only SHA-256 for PKCE verifier challenges.
// Uses node:crypto createHash — supported in Wix Node.js backend (same runtime as pkceProof.js).

import { createHash } from "node:crypto";

/**
 * SHA-256 digest as lowercase 64-character hex.
 * @param {string} value UTF-8 input
 * @returns {string}
 */
export function sha256HexSync(value) {
  if (typeof value !== "string") {
    throw new TypeError("sha256 input must be a string");
  }
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Async wrapper for callers that expect a Promise (PKCE lifecycle).
 * @param {string} value UTF-8 input
 * @returns {Promise<string>}
 */
export async function sha256Hex(value) {
  return sha256HexSync(value);
}

```

### backend/flowCapacity.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/flowCapacity.js`

```javascript
// FILE: examples/good-trouble-wix/backend/flowCapacity.js
// Shared capacity enforcement — purge stale rows before counting; rollback on overrun.

/**
 * @param {import("./nonceLifecycle.js").FlowStore} store
 * @param {Date} [now]
 */
export async function purgeStaleFlows(store, now = new Date()) {
  if (typeof store.purgeStale === "function") {
    await store.purgeStale(now);
  }
}

/**
 * Pre-insert capacity gate (after purge). Not fully atomic alone — pair with finalizeFlowStart.
 * @returns {Promise<{ ok: true } | { ok: false, code: "rate_limited" }>}
 */
export async function assertCapacityAvailable(store, maxPending, now = new Date()) {
  await purgeStaleFlows(store, now);
  if (typeof store.countPending !== "function") return { ok: true };
  const pending = await store.countPending(now);
  if (pending >= maxPending) {
    return { ok: false, code: "rate_limited" };
  }
  return { ok: true };
}

/**
 * Post-insert capacity check — removes the just-inserted row if concurrent starts exceeded cap.
 * @param {import("./nonceLifecycle.js").FlowStore} store
 * @param {string} recordId
 * @param {number} maxPending
 * @param {Date} [now]
 */
export async function finalizeFlowStart(store, recordId, maxPending, now = new Date()) {
  await purgeStaleFlows(store, now);
  if (typeof store.countPending !== "function" || typeof store.removeById !== "function") {
    return { ok: true };
  }
  const pending = await store.countPending(now);
  if (pending > maxPending) {
    await store.removeById(recordId);
    return { ok: false, code: "rate_limited" };
  }
  return { ok: true };
}

```

### backend/captchaGate.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/captchaGate.js`

```javascript
// FILE: examples/good-trouble-wix/backend/captchaGate.js
// Wix reCAPTCHA backend authorization — verified server-side; never trust client-only checks.

const MAX_CAPTCHA_TOKEN_LENGTH = 4096;

/**
 * Authorize a Wix reCAPTCHA token via wix-captcha-backend.authorize().
 * @param {unknown} captchaToken
 * @param {(token: string) => Promise<unknown>} authorizeFn defaults to production Wix module when configured
 */
export async function authorizeCaptchaToken(captchaToken, authorizeFn) {
  const token = typeof captchaToken === "string" ? captchaToken.trim() : "";
  if (!token || token.length > MAX_CAPTCHA_TOKEN_LENGTH) {
    return { ok: false, code: "captcha_required" };
  }
  if (typeof authorizeFn !== "function") {
    return { ok: false, code: "captcha_not_configured" };
  }
  try {
    await authorizeFn(token);
    return { ok: true };
  } catch {
    return { ok: false, code: "captcha_invalid" };
  }
}

```

### backend/wixNonceStore.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/wixNonceStore.js`

```javascript
// FILE: examples/good-trouble-wix/backend/wixNonceStore.js
// wix-data adapter — collection must be Admin-only (no site/member read/write).
// Backend web methods use suppressAuth internally; never expose via web-method args.

import wixData from "wix-data";
import { CONSUMED_FLOW_RETENTION_MS, NONCE_COLLECTION, NONCE_STATE } from "./constants.js";
import { normalizeWixDataCount } from "./wixDataCount.js";

/** @internal Elevated write access for backend-only web methods. */
const BACKEND_WRITE_OPTIONS = { suppressAuth: true };

/** @internal Elevated read access for lifecycle and capacity decisions. */
const BACKEND_READ_OPTIONS = { suppressAuth: true, consistentRead: true };

/**
 * Collection permissions (Wix CMS — AbraxasVerificationNonces):
 * - Read: Admin only
 * - Create: Admin only
 * - Update: Admin only
 * - Delete: Admin only
 *
 * Only backend web methods operate on this collection via suppressAuth.
 *
 * @returns {import("./nonceLifecycle.js").FlowStore}
 */
export function createWixNonceStore() {
  return {
    async insert(record) {
      return wixData.insert(NONCE_COLLECTION, record, BACKEND_WRITE_OPTIONS);
    },
    async findByFlowId(flowId) {
      const { items } = await wixData.query(NONCE_COLLECTION)
        .eq("flowId", flowId)
        .limit(1)
        .find(BACKEND_READ_OPTIONS);
      return items[0] ?? null;
    },
    async updateGuarded(recordId, patch, guards = {}) {
      const current = await wixData.get(NONCE_COLLECTION, recordId, BACKEND_READ_OPTIONS);
      if (!current) return null;
      if (guards.expectedState && current.state !== guards.expectedState) return null;
      if (guards.flowId && current.flowId !== guards.flowId) return null;
      return wixData.update(
        NONCE_COLLECTION,
        { ...current, ...patch, _id: recordId },
        BACKEND_WRITE_OPTIONS,
      );
    },
    async countPending(now = new Date()) {
      const rawCount = await wixData.query(NONCE_COLLECTION)
        .eq("state", NONCE_STATE.PENDING)
        .gt("expiresAt", now)
        .count(BACKEND_READ_OPTIONS);

      const totalCount = normalizeWixDataCount(rawCount);
      if (totalCount === null) {
        throw new Error("Invalid pending-flow count returned by Wix Data");
      }

      return totalCount;
    },
    async removeById(recordId) {
      return wixData.remove(NONCE_COLLECTION, recordId, BACKEND_WRITE_OPTIONS);
    },
    async purgeStale(now = new Date()) {
      const consumedCutoff = new Date(now.getTime() - CONSUMED_FLOW_RETENTION_MS);
      const { items: expired } = await wixData.query(NONCE_COLLECTION)
        .le("expiresAt", now)
        .limit(100)
        .find(BACKEND_READ_OPTIONS);
      const { items: staleConsumed } = await wixData.query(NONCE_COLLECTION)
        .eq("state", NONCE_STATE.CONSUMED)
        .le("consumedAt", consumedCutoff)
        .limit(100)
        .find(BACKEND_READ_OPTIONS);
      const toRemove = new Map();
      for (const item of [...expired, ...staleConsumed]) {
        toRemove.set(item._id, item);
      }
      for (const id of toRemove.keys()) {
        await wixData.remove(NONCE_COLLECTION, id, BACKEND_WRITE_OPTIONS);
      }
      return toRemove.size;
    },
  };
}
```
### backend/abraxasReceiptValidator.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/abraxasReceiptValidator.js`

```javascript
// FILE: examples/good-trouble-wix/backend/abraxasReceiptValidator.js
// Strict Partner Flow public receipt validation for Good Trouble Wix sandbox.
// Mirror lib/partner/verifyPartnerFlowReceipt.ts — keep in sync manually.

const ABRAXAS_ORIGIN = "https://abraxasworld.xyz";
const EXPECTED_PARTNER_ID = "good-trouble-cannabis";
const EXPECTED_POLICY_ID = "good-trouble-retail-v1";
const SUPPORTED_SCHEMA_VERSION = "1.0.0";
const EXPECTED_ARTIFACT_TYPE = "eligibility_decision_receipt";
const SANDBOX_ONLY_INVALIDATION_REASON = "production_not_usable:false";
const RECEIPT_ID_RE = /^dr_[A-Za-z0-9_-]{8,128}$/;

function sharedErrors(receipt, now) {
  const errors = [];
  if (receipt.signature_valid !== true) errors.push("signature_invalid");
  if (receipt.decision_result !== "approved") errors.push(`decision_not_approved:${receipt.decision_result ?? "missing"}`);
  if (receipt.status !== "active") errors.push(`status_not_active:${receipt.status ?? "missing"}`);
  if (receipt.partner_id !== EXPECTED_PARTNER_ID) errors.push("partner_mismatch");
  if (receipt.policy_id !== EXPECTED_POLICY_ID) errors.push("policy_mismatch");
  if (receipt.schema_version !== SUPPORTED_SCHEMA_VERSION) errors.push("schema_version_unsupported");
  if (receipt.artifact_type !== EXPECTED_ARTIFACT_TYPE) errors.push("artifact_type_mismatch");
  if (receipt.artifact_type === "browse_access_receipt") {
    errors.push("browse_receipt_not_purchase_authority");
  }
  if (receipt.valid_for_purchase === false) errors.push("not_valid_for_purchase");
  if (receipt.purpose === "browse") errors.push("browse_purpose_not_checkout");
  if (receipt.assurance_level === "L0") errors.push("l0_not_checkout_authority");

  if (!receipt.expires_at) {
    errors.push("expires_at_missing");
  } else {
    const expiresAt = Date.parse(receipt.expires_at);
    if (!Number.isFinite(expiresAt)) errors.push("expires_at_invalid");
    else if (expiresAt <= now.getTime()) errors.push("receipt_expired");
  }

  for (const ref of receipt.evaluated_claim_refs ?? []) {
    const status = (ref.status ?? "").toLowerCase();
    if (status && status !== "active") errors.push(`claim_not_active:${ref.claim_type ?? "unknown"}`);
  }

  return errors;
}

function sandboxErrors(receipt) {
  const errors = [];
  if (receipt.production_usable !== false) {
    errors.push(receipt.production_usable === undefined
      ? "sandbox_production_usable_missing"
      : "sandbox_production_usable_not_false");
  }
  if (receipt.decision_context !== "sandbox_only") errors.push("sandbox_decision_context_mismatch");
  const reasons = receipt.invalidation_reasons ?? [];
  if (reasons.length !== 1 || reasons[0] !== SANDBOX_ONLY_INVALIDATION_REASON) {
    errors.push("sandbox_invalidation_reason_mismatch");
  }
  return errors;
}

/**
 * @param {unknown} receipt
 * @param {{ now?: Date }} [opts]
 * @returns {{ verified: boolean }}
 */
export function validateSandboxReceipt(receipt, opts = {}) {
  const now = opts.now ?? new Date();
  if (!receipt || typeof receipt !== "object") return { verified: false };
  const errors = [...sharedErrors(receipt, now), ...sandboxErrors(receipt)];
  return { verified: errors.length === 0 };
}

/** Strict sandbox mode identifier — mirrors verifyPartnerFlowReceipt mode: "sandbox". */
export const RECEIPT_VALIDATION_MODE = "sandbox";

/**
 * @param {string} receiptId
 * @returns {Promise<{ verified: boolean, mode: typeof RECEIPT_VALIDATION_MODE }>}
 */
export async function fetchAndValidateSandboxReceipt(receiptId) {
  const id = typeof receiptId === "string" ? receiptId.trim() : "";
  if (!id || id.length > 200 || !RECEIPT_ID_RE.test(id)) {
    return { verified: false, mode: RECEIPT_VALIDATION_MODE };
  }

  let response;
  try {
    response = await fetch(
      `${ABRAXAS_ORIGIN}/api/receipts/${encodeURIComponent(id)}/public`,
      { method: "GET", headers: { Accept: "application/json" } },
    );
  } catch {
    return { verified: false, mode: RECEIPT_VALIDATION_MODE };
  }

  if (!response.ok) return { verified: false, mode: RECEIPT_VALIDATION_MODE };

  let receipt;
  try {
    receipt = await response.json();
  } catch {
    return { verified: false, mode: RECEIPT_VALIDATION_MODE };
  }

  const result = validateSandboxReceipt(receipt);
  return { ...result, mode: RECEIPT_VALIDATION_MODE };
}

```

### backend/browseConstants.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/browseConstants.js`

```javascript
// FILE: examples/good-trouble-wix/backend/browseConstants.js
// Browse-tier constants for Good Trouble Wix integration.

export const BROWSE_RECEIPT_ARTIFACT_TYPE = "browse_access_receipt";
export const BROWSE_POLICY_ID = "good-trouble-browse-v1";
export const BROWSE_ACCESS_STORAGE_KEY = "good_trouble_browse_access_l0";

```

### backend/browseReceiptValidator.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/browseReceiptValidator.js`

```javascript
// FILE: examples/good-trouble-wix/backend/browseReceiptValidator.js
// L0 browse-access receipt validation — UI gate only, not purchase authorization.

import { BROWSE_RECEIPT_ARTIFACT_TYPE } from "./browseConstants.js";

const EXPECTED_PARTNER_ID = "good-trouble-cannabis";
const BROWSE_POLICY_ID = "good-trouble-browse-v1";

/**
 * @param {unknown} payload
 * @param {{ now?: Date, partnerId?: string, policyId?: string }} [opts]
 * @returns {{ verified: boolean, errors: string[] }}
 */
export function validateBrowseAccessPayload(payload, opts = {}) {
  const now = opts.now ?? new Date();
  const errors = [];
  const partnerId = opts.partnerId ?? EXPECTED_PARTNER_ID;
  const policyId = opts.policyId ?? BROWSE_POLICY_ID;

  if (!payload || typeof payload !== "object") {
    return { verified: false, errors: ["payload_missing"] };
  }

  const record = payload;

  if (record.artifact_type !== BROWSE_RECEIPT_ARTIFACT_TYPE) {
    errors.push("artifact_type_mismatch");
  }
  if (record.valid_for_purchase !== false) {
    errors.push("not_browse_receipt");
  }
  if (record.purpose !== "browse") {
    errors.push("purpose_mismatch");
  }
  if (record.assurance_level !== "L0") {
    errors.push("assurance_not_l0");
  }
  if (record.age_band !== "over_21") {
    errors.push("age_band_mismatch");
  }
  if (record.partner_id !== partnerId) {
    errors.push("partner_mismatch");
  }
  if (record.policy_id !== policyId) {
    errors.push("policy_mismatch");
  }
  if (!record.expires_at) {
    errors.push("expires_at_missing");
  } else {
    const expiresAt = Date.parse(record.expires_at);
    if (!Number.isFinite(expiresAt)) errors.push("expires_at_invalid");
    else if (expiresAt <= now.getTime()) errors.push("receipt_expired");
  }

  for (const forbidden of ["date_of_birth", "dob", "legal_name", "address", "document_number"]) {
    if (forbidden in record) errors.push(`forbidden_field:${forbidden}`);
  }

  return { verified: errors.length === 0, errors };
}

/**
 * Browse receipts must never authorize regulated checkout.
 * @param {unknown} receiptOrPayload
 * @returns {{ authorized: false, code: string }}
 */
export function rejectBrowseReceiptForCheckout(receiptOrPayload) {
  if (!receiptOrPayload || typeof receiptOrPayload !== "object") {
    return { authorized: false, code: "receipt_missing" };
  }
  const record = receiptOrPayload;
  if (record.artifact_type === BROWSE_RECEIPT_ARTIFACT_TYPE) {
    return { authorized: false, code: "browse_receipt_not_valid_for_purchase" };
  }
  if (record.valid_for_purchase === false) {
    return { authorized: false, code: "not_valid_for_purchase" };
  }
  if (record.purpose === "browse") {
    return { authorized: false, code: "browse_purpose_not_checkout" };
  }
  if (record.assurance_level === "L0") {
    return { authorized: false, code: "l0_not_checkout_authority" };
  }
  return { authorized: false, code: "requires_authoritative_receipt" };
}

```

### backend/browseReceiptRemoteValidator.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/browseReceiptRemoteValidator.js`

```javascript
// FILE: examples/good-trouble-wix/backend/browseReceiptRemoteValidator.js
// Server-side browse receipt validation via Abraxas — Wix never sees DOB.

import { ABRAXAS_ORIGIN, BROWSE_POLICY_ID, PARTNER_ID } from "./constants.js";
import { validateBrowseAccessPayload } from "./browseReceiptValidator.js";

/**
 * @param {string} browseReceiptJwt
 * @param {{ fetchImpl?: typeof fetch, now?: Date }} [opts]
 * @returns {Promise<{ verified: boolean, transientFailure?: boolean, payload?: object }>}
 */
export async function verifyBrowseReceiptRemotely(browseReceiptJwt, opts = {}) {
  const token = typeof browseReceiptJwt === "string" ? browseReceiptJwt.trim() : "";
  if (!token || token.length > 8192) {
    return { verified: false, transientFailure: false };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  let response;
  try {
    response = await fetchImpl(`${ABRAXAS_ORIGIN}/api/age-assurance/browse-receipt/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        browse_receipt: token,
        partner_id: PARTNER_ID,
        policy_id: BROWSE_POLICY_ID,
      }),
    });
  } catch {
    return { verified: false, transientFailure: true };
  }

  if (!response.ok) {
    return { verified: false, transientFailure: response.status >= 500 };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { verified: false, transientFailure: false };
  }

  if (!body?.verified) {
    return { verified: false, transientFailure: false };
  }

  const payload = {
    artifact_type: "browse_access_receipt",
    valid_for_purchase: false,
    purpose: "browse",
    assurance_level: "L0",
    partner_id: PARTNER_ID,
    policy_id: BROWSE_POLICY_ID,
    expires_at: body.expires_at,
    age_band: body.age_band,
  };

  const local = validateBrowseAccessPayload(payload, { now: opts.now });
  return local.verified
    ? { verified: true, transientFailure: false, payload }
    : { verified: false, transientFailure: false };
}

```

### backend/purchaseEligibilityAuthorization.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/purchaseEligibilityAuthorization.js`

```javascript
// FILE: examples/good-trouble-wix/backend/purchaseEligibilityAuthorization.js
// Server-validated, fresh, consumed, partner-bound, purpose-bound L2+ purchase gate.

import { rejectBrowseReceiptForCheckout } from "./browseReceiptValidator.js";
import { validateSandboxReceipt } from "./abraxasReceiptValidator.js";
import {
  BROWSE_ACCESS_STORAGE_KEY,
  FLOW_PURPOSE_PURCHASE,
  PARTNER_ID,
  POLICY_ID,
  PURCHASE_VERIFIED_SESSION_FLAG,
} from "./constants.js";

const MIN_PURCHASE_ASSURANCE = 2;

function assuranceRank(level) {
  if (level === "L0") return 0;
  if (level === "L1") return 1;
  if (level === "L2") return 2;
  if (level === "L3") return 3;
  if (level === "L4") return 4;
  return -1;
}

/**
 * @param {{
 *   receipt?: unknown,
 *   flowPurpose?: string | null,
 *   flowConsumed?: boolean,
 *   flowPolicyId?: string | null,
 *   urlStatus?: string | null,
 *   urlPolicyId?: string | null,
 *   urlPurpose?: string | null,
 *   sessionStoragePurchaseFlag?: string | null,
 *   sessionStorageBrowseFlag?: string | null,
 *   selfAttestedBrowseOnly?: boolean,
 *   now?: Date,
 * }} input
 * @returns {{ authorized: boolean, code?: string }}
 */
export function authorizePurchaseEligibility(input) {
  const now = input.now ?? new Date();

  if (input.urlStatus === "approved") {
    return { authorized: false, code: "url_status_not_authoritative" };
  }
  if (input.sessionStoragePurchaseFlag) {
    return { authorized: false, code: "session_flag_not_authoritative" };
  }
  if (input.sessionStorageBrowseFlag) {
    return { authorized: false, code: "browse_session_flag_not_checkout" };
  }
  if (input.selfAttestedBrowseOnly) {
    return { authorized: false, code: "self_attestation_not_checkout" };
  }
  if (input.urlPurpose === "browse") {
    return { authorized: false, code: "url_purpose_browse_not_purchase" };
  }
  if (input.urlPolicyId && input.urlPolicyId !== POLICY_ID) {
    return { authorized: false, code: "url_policy_mismatch" };
  }
  if (input.flowPurpose && input.flowPurpose !== FLOW_PURPOSE_PURCHASE) {
    return { authorized: false, code: "flow_purpose_mismatch" };
  }
  if (input.flowPolicyId && input.flowPolicyId !== POLICY_ID) {
    return { authorized: false, code: "flow_policy_mismatch" };
  }
  if (input.flowConsumed !== true) {
    return { authorized: false, code: "flow_not_consumed" };
  }

  const browseReject = rejectBrowseReceiptForCheckout(input.receipt);
  if (browseReject.code !== "requires_authoritative_receipt") {
    return { authorized: false, code: browseReject.code };
  }

  const sandbox = validateSandboxReceipt(input.receipt, { now });
  if (!sandbox.verified) {
    return { authorized: false, code: "authoritative_receipt_invalid" };
  }

  const record = input.receipt && typeof input.receipt === "object"
    ? input.receipt
    : null;
  if (!record) {
    return { authorized: false, code: "receipt_missing" };
  }
  if (record.partner_id !== PARTNER_ID) {
    return { authorized: false, code: "partner_mismatch" };
  }
  if (record.policy_id !== POLICY_ID) {
    return { authorized: false, code: "policy_mismatch" };
  }
  if (record.purpose === "browse") {
    return { authorized: false, code: "receipt_purpose_browse" };
  }

  const assurance = record.assurance_level ?? record.minimum_assurance;
  if (assurance && assuranceRank(String(assurance)) < MIN_PURCHASE_ASSURANCE) {
    return { authorized: false, code: "insufficient_assurance" };
  }

  return { authorized: true };
}

export {
  BROWSE_ACCESS_STORAGE_KEY,
  PURCHASE_VERIFIED_SESSION_FLAG,
};

```

### backend/checkoutAuthorization.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/checkoutAuthorization.js`

```javascript
// FILE: examples/good-trouble-wix/backend/checkoutAuthorization.js
// Regulated checkout requires authoritative L2+ receipt — never browse or client flags.

import { authorizePurchaseEligibility } from "./purchaseEligibilityAuthorization.js";

/**
 * @param {Parameters<typeof authorizePurchaseEligibility>[0]} input
 */
export function authorizeRegulatedCheckout(input) {
  return authorizePurchaseEligibility(input);
}

export function isPilotSessionFlagAuthoritative() {
  return false;
}

export { PURCHASE_VERIFIED_SESSION_FLAG as PILOT_VERIFIED_SESSION_FLAG } from "./constants.js";

```

---
### pages/purchaseVerificationLogic.js

- **Wix destination:** Public file
- **Wix path/name:** `src/public/purchaseVerificationLogic.js`

```javascript
// FILE: examples/good-trouble-wix/pages/purchaseVerificationLogic.js
// Wix deployment: copy to src/public/purchaseVerificationLogic.js

export const PURCHASE_STATUS_STARTING =
  "Starting purchase eligibility verification…";

export const PURCHASE_STATUS_GENERIC_FAILURE =
  "Verification could not be started. Please try again.";

export const PURCHASE_STATUS_RATE_LIMITED =
  "Verification is busy. Please wait a moment and try again.";

/** Stable backend codes that may surface distinct user-facing copy. */
export const ALLOWLISTED_PURCHASE_START_ERROR_CODES = new Set([
  "rate_limited",
  "capacity_count_invalid",
  "nonce_insert_failed",
]);

export const PURCHASE_START_ERROR_MESSAGES = {
  rate_limited: PURCHASE_STATUS_RATE_LIMITED,
  capacity_count_invalid: PURCHASE_STATUS_GENERIC_FAILURE,
  nonce_insert_failed: PURCHASE_STATUS_GENERIC_FAILURE,
  start_incomplete: PURCHASE_STATUS_GENERIC_FAILURE,
  start_exception: PURCHASE_STATUS_GENERIC_FAILURE,
  start_internal_error: PURCHASE_STATUS_GENERIC_FAILURE,
};

/**
 * @param {string} viewMode
 * @returns {boolean}
 */
export function isEditorPreviewViewMode(viewMode) {
  return viewMode === "Preview" || viewMode === "Editor";
}

/**
 * @param {string} code
 * @returns {string}
 */
export function safePurchaseStartErrorMessage(code) {
  return PURCHASE_START_ERROR_MESSAGES[code] ?? PURCHASE_STATUS_GENERIC_FAILURE;
}

/**
 * Preview-only operator hint. Never includes verifier, receipt, token, or PII.
 * @param {{ code?: string, stage?: string, correlationId?: string | null } | null | undefined} diagnostic
 * @returns {string | null}
 */
export function formatPurchasePreviewDiagnostic(diagnostic) {
  if (!diagnostic?.code) return null;
  const parts = [diagnostic.code];
  if (diagnostic.stage) parts.push(`@${diagnostic.stage}`);
  if (diagnostic.correlationId) parts.push(`ref=${diagnostic.correlationId}`);
  return parts.join(" ");
}

/**
 * @param {{
 *   result?: {
 *     error?: string,
 *     diagnostic?: { code?: string, stage?: string, correlationId?: string | null },
 *     verifyUrl?: string,
 *     flowId?: string,
 *     verifier?: string,
 *   } | null,
 *   viewMode?: string,
 * }} params
 * @returns {{ ok: true, result: object } | { ok: false, code: string, message: string, previewDetail?: string }}
 */
export function interpretPurchaseStartResult(params) {
  const result = params.result;
  const viewMode = params.viewMode ?? "Site";
  const preview = isEditorPreviewViewMode(viewMode);
  const previewDetail = preview
    ? formatPurchasePreviewDiagnostic(result?.diagnostic)
    : null;

  if (result?.error) {
    const code = result.error;
    const message = ALLOWLISTED_PURCHASE_START_ERROR_CODES.has(code)
      ? safePurchaseStartErrorMessage(code)
      : PURCHASE_STATUS_GENERIC_FAILURE;
    return {
      ok: false,
      code,
      message,
      ...(previewDetail ? { previewDetail } : {}),
    };
  }

  const { verifyUrl, flowId, verifier } = result ?? {};
  if (!verifyUrl || !flowId || !verifier) {
    return {
      ok: false,
      code: "start_incomplete",
      message: PURCHASE_STATUS_GENERIC_FAILURE,
      ...(previewDetail ? { previewDetail: previewDetail ?? "start_incomplete" } : {}),
    };
  }

  if (!flowId.startsWith("gtf_")) {
    return {
      ok: false,
      code: "start_incomplete",
      message: PURCHASE_STATUS_GENERIC_FAILURE,
      ...(previewDetail ? { previewDetail: previewDetail ?? "invalid_flow_id_prefix" } : {}),
    };
  }

  return {
    ok: true,
    result: {
      verifyUrl,
      flowId,
      verifier,
      purpose: result?.purpose,
      policyId: result?.policyId,
      correlationId: result?.correlationId ?? null,
    },
  };
}

/**
 * @param {{
 *   setStatus: (message: string) => void,
 *   startPurchaseVerification: () => Promise<object>,
 *   getViewMode?: () => string | Promise<string>,
 *   storeVerifier: (flowId: string, verifier: string) => void,
 *   saveReturnDestination: () => void,
 *   navigateToVerifyUrl: (url: string) => void,
 * }} deps
 */
export function createPurchaseVerificationController(deps) {
  return {
    async start() {
      deps.setStatus(PURCHASE_STATUS_STARTING);

      try {
        const result = await deps.startPurchaseVerification();
        const viewMode = deps.getViewMode ? await deps.getViewMode() : "Site";
        const interpreted = interpretPurchaseStartResult({ result, viewMode });

        if (!interpreted.ok) {
          const suffix = interpreted.previewDetail
            ? ` (${interpreted.previewDetail})`
            : "";
          deps.setStatus(`${interpreted.message}${suffix}`);
          return interpreted;
        }

        if (isEditorPreviewViewMode(viewMode)) {
          deps.setStatus(
            `Preview check passed: purchase flow ready (${interpreted.result.flowId.slice(0, 8)}…).`,
          );
          return { ok: true, code: "preview_backend_passed", result: interpreted.result };
        }

        deps.saveReturnDestination();
        deps.storeVerifier(interpreted.result.flowId, interpreted.result.verifier);
        deps.navigateToVerifyUrl(interpreted.result.verifyUrl);
        return { ok: true, code: "redirecting", result: interpreted.result };
      } catch {
        const viewMode = deps.getViewMode ? await deps.getViewMode() : "Site";
        const preview = isEditorPreviewViewMode(viewMode);
        deps.setStatus(
          preview
            ? `${PURCHASE_STATUS_GENERIC_FAILURE} (start_exception)`
            : PURCHASE_STATUS_GENERIC_FAILURE,
        );
        return { ok: false, code: "start_exception", message: PURCHASE_STATUS_GENERIC_FAILURE };
      }
    },
  };
}
```

### backend/flowStartDiagnostics.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/flowStartDiagnostics.js`

```javascript
// FILE: examples/good-trouble-wix/backend/flowStartDiagnostics.js
// Privacy-safe structured diagnostics for verification flow start failures.

import { BROWSE_FLOW, PURCHASE_FLOW } from "./flowPurpose.js";

/** @typedef {"browse" | "purchase"} FlowPurpose */

export const FLOW_START_STAGES = {
  CAPTCHA_GATE: "captcha_gate",
  CAPACITY_PRECHECK: "capacity_precheck",
  PAYLOAD_BUILD: "payload_build",
  NONCE_INSERT: "nonce_insert",
  CAPACITY_FINALIZE: "capacity_finalize",
  RESPONSE_BUILD: "response_build",
};

/** Stable codes safe to return to Preview UI and backend logs. */
export const ALLOWLISTED_FLOW_START_ERROR_CODES = new Set([
  "captcha_required",
  "captcha_invalid",
  "rate_limited",
  "capacity_count_invalid",
  "nonce_insert_failed",
  "payload_build_failed",
  "start_incomplete",
  "start_internal_error",
]);

const PURPOSE_POLICY = {
  browse: {
    purpose: BROWSE_FLOW.purpose,
    policyId: BROWSE_FLOW.policyId,
  },
  purchase: {
    purpose: PURCHASE_FLOW.purpose,
    policyId: PURCHASE_FLOW.policyId,
  },
};

/**
 * @param {FlowPurpose} purpose
 */
export function flowStartContext(purpose) {
  return PURPOSE_POLICY[purpose] ?? PURPOSE_POLICY.purchase;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function mapThrownErrorToStartCode(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("Invalid pending-flow count returned by Wix Data")) {
    return "capacity_count_invalid";
  }
  if (message.includes("wix-data") || message.includes("WixData")) {
    return "nonce_insert_failed";
  }
  return "start_internal_error";
}

/**
 * Privacy-safe backend log payload. Never include verifier, challenge, receipt, token, or PII.
 * @param {{
 *   stage: string,
 *   code: string,
 *   purpose: FlowPurpose,
 *   policyId: string,
 *   correlationId?: string | null,
 * }} entry
 */
export function logFlowStartFailure(entry) {
  const payload = {
    event: "abraxas_flow_start_failed",
    stage: entry.stage,
    code: entry.code,
    purpose: entry.purpose,
    policyId: entry.policyId,
    correlationId: entry.correlationId ?? null,
  };
  console.info(JSON.stringify(payload));
  return payload;
}

/**
 * @param {{
 *   code: string,
 *   stage: string,
 *   purpose: FlowPurpose,
 *   policyId: string,
 *   correlationId?: string | null,
 * }} params
 */
export function buildFlowStartFailure(params) {
  const code = ALLOWLISTED_FLOW_START_ERROR_CODES.has(params.code)
    ? params.code
    : "start_internal_error";

  logFlowStartFailure({
    stage: params.stage,
    code,
    purpose: params.purpose,
    policyId: params.policyId,
    correlationId: params.correlationId ?? null,
  });

  return {
    error: code,
    diagnostic: {
      code,
      stage: params.stage,
      purpose: params.purpose,
      policyId: params.policyId,
      correlationId: params.correlationId ?? null,
    },
  };
}

/**
 * @param {{
 *   verifyUrl: string,
 *   flowId: string,
 *   verifier: string,
 *   purpose: FlowPurpose,
 *   policyId: string,
 *   correlationId?: string | null,
 * }} payload
 */
export function buildFlowStartSuccess(payload) {
  if (!payload.verifyUrl || !payload.flowId || !payload.verifier) {
    return buildFlowStartFailure({
      code: "start_incomplete",
      stage: FLOW_START_STAGES.RESPONSE_BUILD,
      purpose: payload.purpose,
      policyId: payload.policyId,
      correlationId: payload.correlationId ?? null,
    });
  }

  return {
    verifyUrl: payload.verifyUrl,
    flowId: payload.flowId,
    verifier: payload.verifier,
    purpose: payload.purpose,
    policyId: payload.policyId,
    correlationId: payload.correlationId ?? null,
  };
}
```

### backend/wixDataCount.js

- **Wix destination:** Backend file
- **Wix path/name:** `src/backend/wixDataCount.js`

```javascript
// FILE: examples/good-trouble-wix/backend/wixDataCount.js
// Normalizes Wix Data count() results — some Velo runtimes return object-shaped counts.

/**
 * @param {unknown} value
 * @returns {number | null} Safe non-negative integer count, or null when unusable.
 */
export function normalizeWixDataCount(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }

  if (value && typeof value === "object") {
    const candidate = value.totalCount ?? value.count ?? value.total;
    if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0) {
      return candidate;
    }
  }

  return null;
}
```

### Purchase verification start — operator diagnostics

When the Purchase Verification Entry page shows **“Verification could not be started. Please try again.”**, the backend web method failed before redirect. The unpublished `/age-verification-result` callback **does not** block start — it only affects return completion.

**Preview / Editor:** status text appends an allowlisted diagnostic suffix, e.g. `rate_limited @capacity_precheck ref=<correlationId>`.

**Production:** users see only the generic message; backend logs emit structured JSON:

```json
{"event":"abraxas_flow_start_failed","stage":"capacity_precheck","code":"rate_limited","purpose":"purchase","policyId":"good-trouble-retail-v1","correlationId":"..."}
```

| Diagnostic code | Stage | Likely cause | Operator action |
|-----------------|-------|--------------|-----------------|
| `rate_limited` | `capacity_precheck` or `capacity_finalize` | ≥100 unexpired `pending` rows in `AbraxasVerificationNonces` | Run scheduled `purgeStale()`; clear stale test rows |
| `capacity_count_invalid` | `capacity_precheck` | Wix Data `count()` returned non-integer (fixed in `wixDataCount.js`) | Deploy updated `wixNonceStore.js` + `wixDataCount.js` |
| `nonce_insert_failed` | `nonce_insert` | CMS field type mismatch (`purpose`, `policyId` must be **Text**) | Fix collection schema; redeploy backend |
| `start_incomplete` | frontend | Web method returned without `verifyUrl` / `flowId` / `verifier` | Redeploy `abraxasVerification.web.js` + service |
| `start_exception` | frontend | Uncaught web-method error (missing export, import failure) | Ensure `createPurchaseVerificationStart` is deployed with **Anyone** permission |

Successful start always returns `verifyUrl`, `flowId` beginning `gtf_`, and `verifier` (verifier never logged).

---

## D. Secrets and configuration

### Wix Secrets Manager (names only — never paste values into Public/page code)

| Secret name | Intended location | Purpose |
|-------------|-------------------|---------|
| *(none required for current pilot)* | — | Receipt validation uses public Abraxas verify endpoints; no API key in Wix for browse/purchase web methods |

> If CAPTCHA is re-enabled later, add provider secrets to Backend only and remove `skipCaptcha: true` from `abraxasVerification.web.js`.

### Public constants (`src/public/abraxasClientConstants.js`)

- `GTB_PARAM` = `gtb` (browse callback)
- `GTV_PARAM` = `gtv` (purchase callback)
- `BROWSE_VERIFIER_STORAGE_PREFIX` = `abraxas_gt_browse_verifier_`
- `PURCHASE_VERIFIER_STORAGE_PREFIX` = `abraxas_gt_purchase_verifier_`
- `BROWSE_ACCESS_STORAGE_KEY` = `good_trouble_browse_access_l0` (UI-only)
- `PURCHASE_VERIFIED_SESSION_FLAG` = `good_trouble_purchase_verified_pilot` (UI-only, **not checkout authority**)

### Backend constants (`src/backend/constants.js`)

| Constant | Production value |
|----------|------------------|
| `ABRAXAS_ORIGIN` | `https://abraxasworld.xyz` |
| `PARTNER_ID` | `good-trouble-cannabis` |
| `POLICY_ID` (purchase) | `good-trouble-retail-v1` |
| `BROWSE_POLICY_ID` | `good-trouble-browse-v1` |
| `PURCHASE_RETURN_URL_BASE` | `https://www.goodtroublecanna.com/age-verification-result` |
| `BROWSE_RETURN_URL_BASE` | `https://www.goodtroublecanna.com/browse-verification-result` |

---

## E. Callback allowlist (Production SQL)

Idempotent — appends only if missing; does not remove existing URLs. Uses `partner_id`, not UUID `id`.

```sql
-- Good Trouble Wix tiered callbacks (browse + purchase)
UPDATE public.partners
SET allowed_return_urls = (
  SELECT COALESCE(array_agg(DISTINCT url ORDER BY url), ARRAY[]::text[])
  FROM unnest(
    COALESCE(allowed_return_urls, ARRAY[]::text[])
    || ARRAY[
      'https://www.goodtroublecanna.com/browse-verification-result',
      'https://www.goodtroublecanna.com/age-verification-result'
    ]::text[]
  ) AS url
)
WHERE partner_id = 'good-trouble-cannabis';
```

---

## F. Production prerequisites

| Prerequisite | Status on `main` |
|--------------|-------------------|
| Migration `081_self_attestation_ledger.sql` present | ✅ merged |
| `self_attestation_ledger` RLS enabled | ✅ `enable row level security` + revoke anon/authenticated |
| No DOB columns in ledger | ✅ `age_band` only |
| `good-trouble-browse-v1` policy seed | ✅ active v1, `ON CONFLICT (id, version) DO NOTHING` |
| `service_role` grants | ✅ insert/select/update on ledger via migration 081; broader grants in 065 |
| Apply migration 081 before Wix publish | **Required** — browse receipt API depends on ledger + policy |
| Abraxas `POST /api/age-assurance/browse-receipt/verify` live | Required for browse callback completion |
| Abraxas `POST /api/age-assurance/self-attest` live | Required for Abraxas-hosted browse form (not Wix traditional gate) |

**Redeployment assumptions stated:**
1. Apply Supabase migration 081 to Production **before** publishing Wix Velo changes.
2. Run callback allowlist SQL (section E) on Production partners row.
3. Publish Wix Backend files before page/lightbox code.
4. Register new web methods in Wix with **Anyone** permission.
5. Create new pages (`/browse-verification-result`, purchase entry) before switching popup to browse flow.
6. Schedule `wixNonceStore.purgeStale()` (documented operator task — no job file in repo).

---

## G. Wix security verification

**Suite result (main):** `npx vitest run examples/good-trouble-wix/` → **130/130 passed**.

| Requirement | Verified by |
|-------------|-------------|
| Browse receipt cannot authorize purchase | `tieredLifecycleSecurity.test.js`, `checkoutAuthorization.test.js` |
| L0 cannot satisfy L2+ | `purchaseEligibilityAuthorization.js` (`insufficient_assurance`, `self_attestation_not_checkout`) |
| sessionStorage flags are UI-only | `session_flag_not_authoritative`, `browse_session_flag_not_checkout` tests |
| `status=approved` query tampering fails | `url_status_not_authoritative` test |
| partner/policy/purpose mismatch fails | `url_policy_mismatch`, `flow_purpose_mismatch`, `policy_mismatch` tests |
| verifier mismatch fails | `nonceLifecycle.test.js`, `tieredLifecycleSecurity.test.js` |
| consumed receipt replay fails | `flow_not_consumed`, nonce state machine tests |
| DOB never reaches Wix | Browse uses Abraxas redirect + JWT receipt; popup logic stores only traditional gate flag locally |
| Wix backend validates purchase server-side | `authorizePurchaseEligibility` in backend (must be wired to checkout hook — see gaps) |

---

## H. Manual deployment checklist (Wix Editor)

1. **Create pages:** Browse Verification Result (`browse-verification-result`), verify Age Verification Result (`age-verification-result`), create Purchase Verification Entry page.
2. **Assign slugs** exactly as above for callback pages.
3. **Add elements** per section B with exact IDs (`#yesButton`, `#abraxasButton`, etc.).
4. **Enable Dev Mode / Velo** on the site.
5. **Create Public files:** paste `abraxasClientConstants.js`, `ageVerificationPopupLogic.js`.
6. **Create Backend files:** paste all 16 backend modules in dependency order (section A).
7. **Paste page/lightbox code** into each panel (section C).
8. **Configure web methods** — ensure `createBrowseVerificationStart`, `completeBrowseVerification`, `createPurchaseVerificationStart`, `completePurchaseVerification` are exposed with **Anyone** permission.
9. **Preview browse lifecycle:** open site → age popup → Abraxas browse → return to `/browse-verification-result` → confirm browse session flag only.
10. **Preview purchase lifecycle:** open purchase entry page → Abraxas purchase → return to `/age-verification-result` → confirm purchase flag (UI only).
11. **Inspect logs** in Wix backend monitoring — verify flow IDs (`gtb_` / `gtf_`) without logging receipt bodies or PII.
12. **Publish** only after Production migration 081 + callback SQL + all acceptance tests pass.

---

## I. Gap handling

| Gap | Severity | Action |
|-----|----------|--------|
| **Checkout hook not in repo** | High for regulated commerce | `checkoutAuthorization.js` + `purchaseEligibilityAuthorization.js` are deployed backend modules but **no Wix Stores checkout page code** imports them. Operator must wire `authorizeRegulatedCheckout()` into the cart/checkout Velo hook before enabling regulated purchase. |
| `verificationCallbackLogic.js` unused | Low | Duplicate helpers; callback pages inline logic. Safe to skip. |
| `memoryNonceStore.js` | Info | Test-only — do not deploy. |
| Preview `origin_not_allowed` on Abraxas self-attest form | Medium | Fixed in draft PR `cursor/wix-origin-preview-fix-d541` — use `getPublicAppOriginFromRequest` for CSRF guard. |

### Wix ready for manual installation?

**Yes, with stated gaps:** All Velo source files, web methods, pages, and security tests are present on `main`. Manual Wix Editor work (new pages, CMS fields, checkout hook wiring) and Production Supabase migration 081 + callback SQL must be completed before go-live.

### Existing Abraxas preview URLs (reference)

| URL | Renders `SelfAttestationBrowseForm`? | Notes |
|-----|----------------------------------------|-------|
| `/partner/tiered-age-preview?purpose=browse&partner_id=good-trouble-cannabis&policy_id=good-trouble-browse-v1` | Yes | Dev/preview only |
| `/partner/release-gate-preview#browse_self_attest` | Yes | Multi-state screenshot harness |
| `/partner/continue?purpose=browse&...` | Yes (when wallet bound) | Production integration path; requires `verify_request` |
