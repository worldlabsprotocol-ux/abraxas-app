"use client";
// FILE: components/sui/ZkLoginSignInChooserProvider.tsx
// Shared entry point for opening the zkLogin sign-in chooser from nav and CTAs.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ZkLoginSignInChooserDialog } from "./ZkLoginSignInChooserDialog";

type ZkLoginSignInChooserContextValue = {
  openChooser: () => void;
  closeChooser: () => void;
  isOpen: boolean;
};

const ZkLoginSignInChooserContext = createContext<ZkLoginSignInChooserContextValue | null>(null);

export function ZkLoginSignInChooserProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChooser = useCallback(() => setIsOpen(true), []);
  const closeChooser = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ openChooser, closeChooser, isOpen }),
    [openChooser, closeChooser, isOpen],
  );

  return (
    <ZkLoginSignInChooserContext.Provider value={value}>
      {children}
      <ZkLoginSignInChooserDialog open={isOpen} onClose={closeChooser} />
    </ZkLoginSignInChooserContext.Provider>
  );
}

export function useZkLoginSignInChooser(): ZkLoginSignInChooserContextValue {
  const ctx = useContext(ZkLoginSignInChooserContext);
  if (!ctx) {
    throw new Error("useZkLoginSignInChooser must be used within ZkLoginSignInChooserProvider");
  }
  return ctx;
}

export function useZkLoginSignInChooserOptional(): ZkLoginSignInChooserContextValue | null {
  return useContext(ZkLoginSignInChooserContext);
}
