// @vitest-environment jsdom
// FILE: components/admin/AdminConfirmDialog.test.tsx

import "@testing-library/jest-dom/vitest";
import React, { useRef, useState, type ComponentProps } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminConfirmDialog } from "./AdminConfirmDialog";

afterEach(() => {
  cleanup();
});

function renderReceiptRevokeDialog(
  props: Partial<ComponentProps<typeof AdminConfirmDialog>> = {},
) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const { context, ...rest } = props;
  const utils = render(
    <AdminConfirmDialog
      open
      busy={false}
      actionKey="receipt.revoke"
      context={{ receiptId: "rcpt_demo", reasonCode: "", ...context }}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...rest}
    />,
  );
  return { onConfirm, onCancel, ...utils };
}

function EscapeFocusHarness() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <AdminConfirmDialog
        open={open}
        busy={false}
        actionKey="privacy.deny"
        context={{ requestRef: "req_demo", requestType: "data_export" }}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe("AdminConfirmDialog", () => {
  it("disables receipt revoke Confirm until a required reason code is selected", () => {
    renderReceiptRevokeDialog({ context: { receiptId: "rcpt_demo", reasonCode: "" } });

    expect(screen.getByRole("button", { name: "Revoke receipt" })).toBeDisabled();
  });

  it("enables receipt revoke Confirm when reason code is present in context", () => {
    renderReceiptRevokeDialog({
      context: { receiptId: "rcpt_demo", reasonCode: "operator_security_review" },
    });

    expect(screen.getByRole("button", { name: "Revoke receipt" })).toBeEnabled();
  });

  it("does not call onConfirm before an explicit Confirm click", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderReceiptRevokeDialog({
      context: { receiptId: "rcpt_demo", reasonCode: "operator_security_review" },
    });

    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("while busy, disables Confirm and Cancel, ignores backdrop clicks, and ignores Escape", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { container } = render(
      <AdminConfirmDialog
        open
        busy
        actionKey="privacy.deny"
        context={{ requestRef: "req_demo", requestType: "data_export" }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    await user.keyboard("{Escape}");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("when idle, Escape cancels and focus returns to the trigger after closing", async () => {
    const user = userEvent.setup();
    render(<EscapeFocusHarness />);

    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("does not invoke onConfirm twice while busy blocks repeated Confirm clicks", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <AdminConfirmDialog
        open
        busy={false}
        actionKey="privacy.deny"
        context={{ requestRef: "req_demo", requestType: "data_export" }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Deny request" });
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <AdminConfirmDialog
        open
        busy
        actionKey="privacy.deny"
        context={{ requestRef: "req_demo", requestType: "data_export" }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const busyConfirm = screen.getByRole("button", { name: "Working…" });
    expect(busyConfirm).toBeDisabled();
    await user.click(busyConfirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
