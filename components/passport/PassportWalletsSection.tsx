"use client";
// FILE: components/passport/PassportWalletsSection.tsx
// Holder wallet trust-control surface — explicit linking, not discovery.

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBindEvmWallet } from "@/lib/walletAuthority/client/useBindEvmWallet";
import { bindEvmWalletToPassport } from "@/lib/walletAuthority/client/bindEvmWallet";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import type { HolderWalletControlStatus } from "@/lib/walletControl/holderWalletView";

const FONT = ABRAXAS_FONT_SANS;
const CARD = {
  background: PUBLIC_SURFACE.cardBackground,
  border: PUBLIC_SURFACE.cardBorder,
  borderRadius: PUBLIC_SURFACE.cardRadius,
  padding: PUBLIC_SURFACE.cardPadding,
  marginBottom: "1rem",
} as const;

const STATUS_COLOR: Record<HolderWalletControlStatus, string> = {
  verified: "#10B981",
  refresh_needed: "#F59E0B",
  revoked: "var(--text-muted)",
};

export interface PassportWalletListItem {
  id: string;
  chain: string;
  chain_label: string;
  network: string | null;
  wallet_address: string;
  address_short: string;
  binding_status: string;
  binding_method: string;
  verified_at: string | null;
  expires_at: string | null;
  control_status: HolderWalletControlStatus;
  control_status_label: string;
  freshness_label: string;
}

async function fetchHolderWallets(): Promise<PassportWalletListItem[]> {
  const res = await fetch("/api/wallet-authority/wallets", { credentials: "include" });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to load wallets");
  const data = await res.json() as { wallets?: PassportWalletListItem[] };
  return data.wallets ?? [];
}

function formatVerifiedAt(iso: string | null): string {
  if (!iso) return "Not verified yet";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PassportWalletsSection({
  onChanged,
}: {
  onChanged?: () => void | Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [pendingUnlinkId, setPendingUnlinkId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showAddWallet, setShowAddWallet] = useState(false);

  const walletsQuery = useQuery({
    queryKey: ["passport-holder-wallets"],
    queryFn: fetchHolderWallets,
    staleTime: 10_000,
  });

  const wallets = walletsQuery.data ?? [];
  const evmBind = useBindEvmWallet({ chainId: 1 });

  const refreshWallets = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["passport-holder-wallets"] });
    await queryClient.invalidateQueries({ queryKey: ["passport-canonical", "wallets"] });
    await onChanged?.();
  }, [queryClient, onChanged]);

  const connectWallet = useCallback(async () => {
    setActionError(null);
    setActionMessage(null);
    try {
      let boundAddress = "";
      if (evmBind.uiState.showInjected) {
        const result = await evmBind.bindInjected();
        boundAddress = result.address;
      } else if (evmBind.uiState.showWalletConnect) {
        const result = await evmBind.bindWalletConnect();
        boundAddress = result.address;
      } else {
        throw new Error(evmBind.uiState.blockedHint ?? "No wallet connection available in this browser.");
      }
      const duplicate = wallets.some(
        w => w.wallet_address.toLowerCase() === boundAddress.toLowerCase(),
      );
      setActionMessage(duplicate ? "Wallet control proof refreshed." : "Wallet connected.");
      setShowAddWallet(false);
      await refreshWallets();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not connect wallet";
      if (/reject|denied|cancel/i.test(msg)) {
        setActionError("Signature cancelled. No changes were made.");
      } else {
        setActionError(msg);
      }
    }
  }, [evmBind, refreshWallets, wallets]);

  const refreshWallet = useCallback(async (wallet: PassportWalletListItem) => {
    setRefreshingId(wallet.id);
    setActionError(null);
    setActionMessage(null);
    try {
      await bindEvmWalletToPassport({
        expectedWalletAddress: wallet.wallet_address,
        chainId: 1,
      });
      setActionMessage("Wallet control proof refreshed.");
      await refreshWallets();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not refresh wallet";
      if (/reject|denied|cancel/i.test(msg)) {
        setActionError("Signature cancelled. No changes were made.");
      } else {
        setActionError(msg);
      }
    } finally {
      setRefreshingId(null);
    }
  }, [refreshWallets]);

  const unlinkWallet = useCallback(async (bindingId: string) => {
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/wallet-authority/wallets/${bindingId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "holder_unlinked" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Could not unlink wallet");
      }
      setPendingUnlinkId(null);
      setActionMessage("Wallet unlinked. Future eligibility checks will not use this control proof.");
      await refreshWallets();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not unlink wallet");
    }
  }, [refreshWallets]);

  const addWalletDisabled = evmBind.loading || Boolean(refreshingId);
  const emptyState = wallets.length === 0;

  const privacyCopy = useMemo(() => (
    "Applications do not automatically receive your connected wallet list. When a service requests wallet eligibility, Abraxas shares only the approved result unless you explicitly authorize more."
  ), []);

  return (
    <section style={CARD} aria-labelledby="passport-wallets-heading">
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)",
        letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 0.35rem",
      }}>
        My wallets
      </p>
      <h2 id="passport-wallets-heading" style={{
        fontFamily: FONT, fontSize: "1rem", fontWeight: 800, margin: "0 0 0.35rem", color: "var(--text-primary)",
      }}>
        Wallets you chose to prove
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: "0 0 0.75rem",
      }}>
        Connect a wallet to prove control to Abraxas. This is a control proof only — not identity, ownership, or a transaction approval.
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text-muted)", margin: "0 0 1rem",
      }}>
        {privacyCopy}
      </p>

      {walletsQuery.isLoading && (
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
          Loading wallets…
        </p>
      )}

      {emptyState && !walletsQuery.isLoading && (
        <div style={{
          border: "1px dashed var(--border)",
          borderRadius: 12,
          padding: "1rem",
          marginBottom: "0.85rem",
        }}>
          <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
            No wallets connected yet. Abraxas does not discover wallets automatically — you choose what to link.
          </p>
          <Btn size="lg" fullWidth loading={addWalletDisabled} onClick={() => void connectWallet()}>
            {evmBind.loading ? "Waiting for signature…" : "Connect wallet"}
          </Btn>
        </div>
      )}

      {!emptyState && (
        <ul style={{ listStyle: "none", margin: "0 0 0.85rem", padding: 0, display: "grid", gap: "0.65rem" }}>
          {wallets.map(wallet => (
            <li key={wallet.id} style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "0.85rem 0.9rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)",
                    margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {wallet.chain_label}
                  </p>
                  <p style={{
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    fontSize: "0.84rem",
                    margin: "0 0 0.25rem",
                    color: "var(--text-primary)",
                    wordBreak: "break-all",
                  }}
                    aria-label={`Wallet address ${wallet.wallet_address}`}
                  >
                    {wallet.address_short}
                  </p>
                  <p style={{
                    fontFamily: FONT,
                    fontSize: "0.78rem",
                    margin: 0,
                    color: STATUS_COLOR[wallet.control_status],
                    fontWeight: 700,
                  }}>
                    {wallet.control_status_label}
                  </p>
                  <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                    {wallet.freshness_label} · Last verified {formatVerifiedAt(wallet.verified_at)}
                  </p>
                </div>
                <div style={{ display: "grid", gap: "0.35rem", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => void refreshWallet(wallet)}
                    disabled={addWalletDisabled}
                    style={{
                      fontFamily: FONT,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      padding: "0.35rem 0.65rem",
                      cursor: addWalletDisabled ? "wait" : "pointer",
                    }}
                  >
                    {refreshingId === wallet.id ? "Refreshing…" : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingUnlinkId(wallet.id)}
                    style={{
                      fontFamily: FONT,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "#EF4444",
                      padding: "0.35rem 0.65rem",
                      cursor: "pointer",
                    }}
                  >
                    Unlink
                  </button>
                </div>
              </div>
              {pendingUnlinkId === wallet.id && (
                <div style={{
                  marginTop: "0.75rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border)",
                }}
                  role="dialog"
                  aria-labelledby={`unlink-${wallet.id}`}
                >
                  <p id={`unlink-${wallet.id}`} style={{
                    fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.55,
                  }}>
                    Abraxas will stop using this wallet&apos;s control proof for future eligibility checks. Past signed results stay historically authentic.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Btn size="sm" variant="secondary" onClick={() => setPendingUnlinkId(null)}>Cancel</Btn>
                    <Btn size="sm" onClick={() => void unlinkWallet(wallet.id)}>Unlink wallet</Btn>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!emptyState && (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {!showAddWallet ? (
            <Btn size="lg" fullWidth variant="secondary" onClick={() => setShowAddWallet(true)}>
              Add wallet
            </Btn>
          ) : (
            <div style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "0.85rem",
            }}>
              <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
                Sign a message to prove you control this wallet. No transaction will be created. Abraxas does not move funds or read balances.
              </p>
              <Btn size="lg" fullWidth loading={addWalletDisabled} onClick={() => void connectWallet()}>
                {evmBind.loading ? "Waiting for signature…" : "Connect another wallet"}
              </Btn>
              <button
                type="button"
                onClick={() => setShowAddWallet(false)}
                style={{
                  marginTop: "0.55rem",
                  fontFamily: FONT,
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {(actionError || evmBind.error) && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", margin: "0.75rem 0 0" }}>
          {actionError ?? evmBind.error}
        </p>
      )}
      {actionMessage && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#10B981", margin: "0.75rem 0 0" }}>
          {actionMessage}
        </p>
      )}

      <p style={{
        fontFamily: FONT,
        fontSize: "0.72rem",
        lineHeight: 1.5,
        color: "var(--text-muted)",
        margin: "0.85rem 0 0",
      }}>
        Connecting a wallet does not automatically share it with applications. Each service still asks separately, and you choose whether to proceed.
      </p>
    </section>
  );
}
