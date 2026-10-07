// FILE: lib/sui/zklogin/startNativeOAuth.ts
// Open Google OAuth in the system browser (Custom Tab) for native holder apps.

export async function openNativeOAuthUrl(url: string): Promise<void> {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}
