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
