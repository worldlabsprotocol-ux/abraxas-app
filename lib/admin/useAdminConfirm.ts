// FILE: lib/admin/useAdminConfirm.ts
// Opens AdminConfirmDialog before running a deferred admin mutation.

"use client";

import { useCallback, useRef, useState } from "react";
import type { AdminConfirmActionKey } from "@/lib/admin/adminConfirmCopy";

export interface AdminConfirmRequest {
  actionKey: AdminConfirmActionKey;
  context?: Record<string, string | number>;
  onConfirmed: () => void | Promise<void>;
}

export function useAdminConfirm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<AdminConfirmRequest | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const requestConfirm = useCallback((request: AdminConfirmRequest) => {
    if (busy) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setPending(request);
    setOpen(true);
  }, [busy]);

  const handleCancel = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setPending(null);
    returnFocusRef.current?.focus();
  }, [busy]);

  const handleConfirm = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await pending.onConfirmed();
      setOpen(false);
      setPending(null);
      returnFocusRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }, [busy, pending]);

  return {
    requestConfirm,
    confirmDialogProps: {
      open,
      busy,
      actionKey: pending?.actionKey ?? null,
      context: pending?.context ?? {},
      onConfirm: () => void handleConfirm(),
      onCancel: handleCancel,
    },
  };
}
