"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface ToastContextValue {
  showToast: (message: string) => void;
  message: string | null;
  visible: boolean;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, message, visible }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
