"use client";
// FILE: components/nav/PublicNavWalletButton.tsx
// Connect Wallet — Wallet Standard discovery only; not Abraxas account authentication.

import { useRef, useState, useEffect } from "react";
import { SuiWalletStandardConnect } from "@/components/sui/SuiWalletStandardConnect";
import { PublicNavConnectPrimary } from "@/components/nav/PublicNavAccountMenu";

export function PublicNavWalletButton({ prominent = false }: { prominent?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="public-nav-connect public-nav-wallet">
      <button
        type="button"
        className={`public-nav-connect__trigger public-nav-connect__trigger--secondary${prominent ? " public-nav-connect__trigger--prominent" : ""}`}
        aria-label="Connect a supported Sui wallet"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="public-nav-connect__trigger-label">Connect Wallet</span>
      </button>
      {open ? (
        <div className="public-nav-connect__menu public-nav-wallet__panel" role="dialog" aria-label="Wallet connection">
          <p className="public-nav-connect__menu-title">Connect wallet</p>
          <p className="public-nav-connect__menu-desc">
            Links a wallet address for optional on-chain actions. This does not sign you into an Abraxas account.
          </p>
          <SuiWalletStandardConnect compact />
        </div>
      ) : null}
    </div>
  );
}
