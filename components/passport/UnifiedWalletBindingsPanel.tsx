"use client";
// FILE: components/passport/UnifiedWalletBindingsPanel.tsx
// Single source of truth UI — all wallet bindings (Sui + EVM) for this Passport subject.

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EvmWalletConnectActions } from "@/components/wallet/EvmWalletConnectActions";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { useBindEvmWallet } from "@/lib/walletAuthority/client/useBindEvmWallet";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const RED = "#EF4444";

export interface WalletBindingView {
  id: string;
  chain: string;
  chain_id: number | null;
  wallet_address: string;
  binding_status: string;
  binding_method: string;
  verified_at: string;
}

async function fetchWalletBindings(): Promise<WalletBindingView[]> {
  const res = await fetch("/api/wallet-authority/wallets", { credentials: "include" });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to load wallet bindings");
  const data = await res.json() as { wallets?: WalletBindingView[] };
  return data.wallets ?? [];
}

function formatAddress(chain: string, address: string): string {
  if (chain === "evm") {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }
  return truncateSuiAddress(address, 8, 6);
}

function statusColor(status: string): string {
  if (status === "active") return ACCENT;
  if (status === "compromised") return RED;
  return "var(--text-muted)";
}

export function UnifiedWalletBindingsPanel({
  suiAddress,
  onSuiBind,
  suiBindBusy,
}: {
  suiAddress: string | null;
  onSuiBind?: () => void;
  suiBindBusy?: boolean;
}) {
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const { data: wallets = [], isLoading, refetch } = useQuery({
    queryKey: ["wallet-bindings", suiAddress],
    queryFn: fetchWalletBindings,
    enabled: Boolean(suiAddress),
  });

  const {
    bindInjected,
    bindWalletConnect,
    loading: evmBindLoading,
    error: evmBindError,
    bound: evmBound,
    uiState,
  } = useBindEvmWallet({ credentials: "include" });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["wallet-bindings", suiAddress] });
    await refetch();
  }, [queryClient, refetch, suiAddress]);

  async function revokeBinding(bindingId: string) {
    setRevokingId(bindingId);
    setActionError("");
    try {
      const res = await fetch(`/api/wallet-authority/wallets/${bindingId}/revoke`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "user_revoked_binding" }),
      });
      const data = await res.json() as { error?: string; revoked_claim_ids?: string[] };
      if (!res.ok) throw new Error(data.error ?? "Revoke failed");
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  const activeSui = wallets.find(w => w.chain === "sui" && w.binding_status === "active");
  const activeEvm = wallets.filter(w => w.chain === "evm" && w.binding_status === "active");

  return (
    <section style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      padding: "1.15rem 1.25rem",
      marginBottom: "1.25rem",
    }} aria-labelledby="unified-wallets-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.35rem",
      }}>
        Wallets
      </div>
      <h2 id="unified-wallets-heading" style={{
        fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.5rem",
      }}>
        Connected wallets
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 560,
      }}>
        Every chain tied to this Passport. Remove a wallet anytime — partner access updates immediately.
      </p>

      {isLoading && (
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)" }}>Loading bindings…</p>
      )}

      {!isLoading && wallets.length === 0 && (
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          No wallet bindings yet. Bind Sui or MetaMask below.
        </p>
      )}

      {wallets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1rem" }}>
          {wallets.map(w => (
            <div key={w.id} style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem",
              padding: "0.75rem 0.85rem", borderRadius: 12,
              background: "var(--surface-inset)", border: "1px solid var(--border)",
            }}>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {w.chain === "evm" ? "MetaMask / EVM" : "Sui / zkLogin"}
                  {w.chain_id ? ` · chain ${w.chain_id}` : ""}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                  {formatAddress(w.chain, w.wallet_address)}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2 }}>
                  Added {new Date(w.verified_at).toLocaleDateString()} · {w.binding_method}
                </div>
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
                color: statusColor(w.binding_status), textTransform: "capitalize",
              }}>
                {w.binding_status}
              </div>
              {w.binding_status === "active" && (
                <button
                  type="button"
                  onClick={() => void revokeBinding(w.id)}
                  disabled={revokingId === w.id}
                  style={{
                    padding: "0.4rem 0.75rem", borderRadius: 999,
                    border: `1px solid ${RED}44`, background: `${RED}12`,
                    color: RED, fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
                    cursor: revokingId === w.id ? "wait" : "pointer",
                  }}
                >
                  {revokingId === w.id ? "Revoking…" : "Revoke"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {!activeSui && onSuiBind && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              Add Sui wallet
            </div>
            <Btn size="sm" onClick={onSuiBind} loading={suiBindBusy} disabled={suiBindBusy}>
              Sign to connect →
            </Btn>
          </div>
        )}

        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem" }}>
            Add MetaMask (EVM)
          </div>
          {!evmBound && (
            <EvmWalletConnectActions
              uiState={uiState}
              loading={evmBindLoading}
              injectedLabel="Connect MetaMask"
              walletConnectLabel="Connect via WalletConnect"
              onInjected={() => void bindInjected().then(() => refresh()).catch(() => undefined)}
              onWalletConnect={() => void bindWalletConnect().then(() => refresh()).catch(() => undefined)}
            />
          )}
          {evmBound && activeEvm.length > 0 && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, margin: 0 }}>
              EVM wallet bound: {formatAddress("evm", activeEvm[0].wallet_address)}
            </p>
          )}
        </div>
      </div>

      {(actionError || evmBindError) && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: RED, marginTop: "0.75rem", marginBottom: 0 }}>
          {actionError || evmBindError}
        </p>
      )}
    </section>
  );
}
