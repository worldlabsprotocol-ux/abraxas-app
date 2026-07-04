// FILE: lib/i18n/googleTranslate.ts
// Google Translate cookie + preference helpers. English is the default;
// translation only applies when the user explicitly picks another language.

export const LANG_STORAGE_KEY = "abraxas_lang_v2";

export function readLanguagePreference(): string {
  if (typeof window === "undefined") return "en";
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) ?? "en";
  } catch {
    return "en";
  }
}

export function writeLanguagePreference(code: string) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

/** Remove googtrans cookies that force auto-translation to Spanish etc. */
export function clearGoogleTranslateCookies() {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  const variants = [
    "googtrans=;expires=" + expires + ";path=/",
    "googtrans=;expires=" + expires + ";path=/;domain=" + host,
    "googtrans=;expires=" + expires + ";path=/;domain=." + host,
  ];
  for (const c of variants) {
    document.cookie = c;
  }
}

/** Pin page to English source (prevents stale /en/es cookies). */
export function pinEnglishCookies() {
  if (typeof document === "undefined") return;
  document.cookie = "googtrans=/en/en;path=/";
}

export function setDocumentLanguage(code: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = code === "en" ? "en" : code;
  if (code === "en") {
    document.documentElement.setAttribute("translate", "no");
  } else {
    document.documentElement.removeAttribute("translate");
  }
}

export function waitForGoogleTranslateCombo(maxMs = 8000): Promise<HTMLSelectElement | null> {
  return new Promise(resolve => {
    const started = Date.now();
    const tick = () => {
      const sel = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (sel) {
        resolve(sel);
        return;
      }
      if (Date.now() - started >= maxMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

export async function applyGoogleTranslateLanguage(code: string): Promise<boolean> {
  const sel = await waitForGoogleTranslateCombo();
  if (!sel) return false;
  sel.value = code;
  sel.dispatchEvent(new Event("change"));
  return true;
}

export async function resetToEnglish(): Promise<boolean> {
  clearGoogleTranslateCookies();
  pinEnglishCookies();
  writeLanguagePreference("en");
  setDocumentLanguage("en");
  const sel = await waitForGoogleTranslateCombo(3000);
  if (sel) {
    sel.value = "";
    sel.dispatchEvent(new Event("change"));
  }
  return true;
}
