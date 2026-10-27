// FILE: lib/i18n/publicLocaleOptions.ts
// Public language menu — only list tiers we can honestly support in the UI.

export type PublicLocaleTier = "native" | "auto_translate_beta";

export type PublicLocaleOption = {
  code: string;
  name: string;
  badge: string;
  tier: PublicLocaleTier;
};

/** English is the authored source; other locales use Google Translate when selected. */
export const PUBLIC_LOCALE_OPTIONS: PublicLocaleOption[] = [
  { code: "en", name: "English", badge: "EN", tier: "native" },
  { code: "es", name: "Español", badge: "ES", tier: "auto_translate_beta" },
  { code: "pt", name: "Português", badge: "PT", tier: "auto_translate_beta" },
  { code: "fr", name: "Français", badge: "FR", tier: "auto_translate_beta" },
  { code: "de", name: "Deutsch", badge: "DE", tier: "auto_translate_beta" },
  { code: "zh-CN", name: "中文", badge: "ZH", tier: "auto_translate_beta" },
];

export function publicLocaleByCode(code: string): PublicLocaleOption {
  return PUBLIC_LOCALE_OPTIONS.find((l) => l.code === code) ?? PUBLIC_LOCALE_OPTIONS[0];
}
