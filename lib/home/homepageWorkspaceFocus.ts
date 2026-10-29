// FILE: lib/home/homepageWorkspaceFocus.ts
// Keep the homepage builder active task in view — never scroll to unrelated anchors.

export const HOMEPAGE_WORKSPACE_FOCUS_EVENT = "abraxas:homepage-workspace-focus" as const;

export const HOMEPAGE_WORKSPACE_ROOT_SELECTOR = "[data-homepage-workspace]";
export const HOMEPAGE_ACTIVE_TASK_SELECTOR = "[data-homepage-active-task]";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scroll the inline builder task into view without hijacking deliberate navigation away. */
export function focusHomepageBuilderWorkspace(options?: { behavior?: ScrollBehavior }): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path !== "/" && path !== "") return;

  const behavior = options?.behavior ?? (prefersReducedMotion() ? "auto" : "smooth");
  const target =
    document.querySelector(HOMEPAGE_ACTIVE_TASK_SELECTOR)
    ?? document.querySelector(HOMEPAGE_WORKSPACE_ROOT_SELECTOR)
    ?? document.getElementById("start-sandbox");

  if (!target || typeof target.scrollIntoView !== "function") return;

  target.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
}

export function dispatchHomepageWorkspaceFocus(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HOMEPAGE_WORKSPACE_FOCUS_EVENT));
}
