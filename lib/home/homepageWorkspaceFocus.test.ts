import { describe, expect, it } from "vitest";
import {
  HOMEPAGE_ACTIVE_TASK_SELECTOR,
  HOMEPAGE_WORKSPACE_ROOT_SELECTOR,
} from "./homepageWorkspaceFocus";

describe("homepageWorkspaceFocus selectors", () => {
  it("targets inline workspace and active task markers", () => {
    expect(HOMEPAGE_WORKSPACE_ROOT_SELECTOR).toBe("[data-homepage-workspace]");
    expect(HOMEPAGE_ACTIVE_TASK_SELECTOR).toBe("[data-homepage-active-task]");
  });
});
