// @vitest-environment jsdom
// FILE: components/design/AbxPageShell.atmosphere.test.tsx

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AbxPageShell } from "@/components/design/AbxPageShell";

vi.mock("@/components/redesign/RedesignShell", () => ({
  RedesignShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/redesign/RedesignFooter", () => ({
  RedesignFooter: () => null,
}));

describe("AbxPageShell visualAtmosphere", () => {
  it("renders calm atmosphere layers when enabled", () => {
    const { container } = render(
      <AbxPageShell accent="passport" visualAtmosphere="calm" withFooter={false}>
        <p>Passport content</p>
      </AbxPageShell>,
    );
    expect(container.querySelector(".abx-product-shell--atmospheric")).toBeTruthy();
    expect(container.querySelector(".abx-product-atmosphere--calm")).toBeTruthy();
    expect(screen.getByText("Passport content")).toBeTruthy();
  });
});
